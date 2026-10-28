const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const assert = require('node:assert');

const testStorageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
const previousStorageDirectory = process.env.STORAGE_DIR;
const previousMaxFileSize = process.env.MAX_FILE_SIZE_BYTES;
process.env.STORAGE_DIR = testStorageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');
if (previousStorageDirectory === undefined) {
  delete process.env.STORAGE_DIR;
} else {
  process.env.STORAGE_DIR = previousStorageDirectory;
}
if (previousMaxFileSize === undefined) {
  delete process.env.MAX_FILE_SIZE_BYTES;
} else {
  process.env.MAX_FILE_SIZE_BYTES = previousMaxFileSize;
}

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(testStorageDirectory, { recursive: true, force: true });
});

function createUploadForm(fileName, contents) {
  const form = new FormData();
  form.append('file', new Blob([contents]), fileName);
  return form;
}

// Teste de fumaça: garante que o app Express foi exportado.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('GET /health continua respondendo', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { status: 'ok' });
});

test('faz upload e lista documentos apenas para o usuário correspondente', async () => {
  const contents = Buffer.from('conteúdo do documento');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: createUploadForm('relatorio.pdf', contents),
  });
  const document = await uploadResponse.json();

  assert.strictEqual(uploadResponse.status, 201);
  assert.deepStrictEqual(Object.keys(document).sort(), [
    'id',
    'originalName',
    'owner',
    'size',
    'uploadedAt',
  ]);
  assert.strictEqual(document.originalName, 'relatorio.pdf');
  assert.strictEqual(document.size, contents.length);
  assert.strictEqual(document.owner, 'alice');
  assert.ok(Number.isFinite(Date.parse(document.uploadedAt)));

  const ownerList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'alice' },
  });
  const otherList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'bob' },
  });

  assert.deepStrictEqual((await ownerList.json()).documents, [document]);
  assert.deepStrictEqual((await otherList.json()).documents, []);
});

test('baixa o documento do dono e oculta documentos de outros usuários', async () => {
  const contents = Buffer.from('arquivo para download');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'carol' },
    body: createUploadForm('arquivo.txt', contents),
  });
  const document = await uploadResponse.json();

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'carol' },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.match(downloadResponse.headers.get('content-disposition'), /filename="arquivo\.txt"/);
  assert.deepStrictEqual(Buffer.from(await downloadResponse.arrayBuffer()), contents);

  const otherUserResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'dave' },
  });
  const missingResponse = await fetch(`${baseUrl}/documents/missing/download`, {
    headers: { 'X-User-Id': 'dave' },
  });

  assert.strictEqual(otherUserResponse.status, 404);
  assert.deepStrictEqual(await otherUserResponse.json(), await missingResponse.json());
});

test('retorna erros de validação de upload e de usuário', async () => {
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const wrongFieldForm = new FormData();
  wrongFieldForm.append('document', new Blob(['arquivo']), 'arquivo.txt');
  const wrongFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: wrongFieldForm,
  });
  assert.strictEqual(wrongFieldResponse.status, 400);
  assert.strictEqual((await wrongFieldResponse.json()).error.code, 'INVALID_FILE_FIELD');

  const invalidOwnerResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': '   ' },
  });
  assert.strictEqual(invalidOwnerResponse.status, 400);
  assert.strictEqual((await invalidOwnerResponse.json()).error.code, 'INVALID_USER_ID');
});

test('rejeita arquivos acima do limite configurado', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('grande.bin', Buffer.alloc(1025)),
  });

  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
});

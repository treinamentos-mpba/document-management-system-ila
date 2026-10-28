const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(projectRoot, process.env.STORAGE_DIR)
  : path.join(projectRoot, 'backend', 'storage');
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES ?? 10485760);

if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes < 1) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

fs.mkdirSync(storageDirectory, { recursive: true });

module.exports = { storageDirectory, maxFileSizeBytes };
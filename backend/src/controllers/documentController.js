function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function getDownloadName(originalName) {
  const fileName = originalName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();

  return fileName || 'document';
}

function createDocumentController(documentService) {
  function resolveOwner(req, res, next) {
    const header = req.get('X-User-Id');

    if (header === undefined) {
      req.owner = 'default';
      return next();
    }

    const owner = header.trim();

    if (!owner || owner.length > 100) {
      return sendError(res, 400, 'INVALID_USER_ID', 'Identificador de usuário inválido.');
    }

    req.owner = owner;
    return next();
  }

  function upload(req, res, next) {
    if (!req.file) {
      return sendError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
    }

    try {
      const document = documentService.createDocument(req.file, req.owner);
      return res.status(201).json(document);
    } catch (error) {
      return next(error);
    }
  }

  function list(req, res, next) {
    try {
      const documents = documentService.listDocuments(req.owner);
      return res.status(200).json({ documents });
    } catch (error) {
      return next(error);
    }
  }

  function download(req, res, next) {
    const document = documentService.findDownloadByOwner(req.params.id, req.owner);

    if (!document) {
      return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    return res.download(
      document.filePath,
      getDownloadName(document.originalName),
      { headers: { 'Content-Type': 'application/octet-stream' } },
      (error) => {
        if (!error) {
          return;
        }

        if (error.code === 'ENOENT' && !res.headersSent) {
          return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
        }

        return next(error);
      },
    );
  }

  return { resolveOwner, upload, list, download };
}

module.exports = { createDocumentController };
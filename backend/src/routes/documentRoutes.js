const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const { storageDirectory, maxFileSizeBytes } = require('../config');

function createDocumentRouter(documentController) {
  const router = express.Router();
  const storage = multer.diskStorage({
    destination: storageDirectory,
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });

  router.post(
    '/upload',
    documentController.resolveOwner,
    upload.single('file'),
    documentController.upload,
  );
  router.get('/documents', documentController.resolveOwner, documentController.list);
  router.get(
    '/documents/:id/download',
    documentController.resolveOwner,
    documentController.download,
  );

  router.use((error, req, res, next) => {
    if (!(error instanceof multer.MulterError)) {
      return next(error);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
      });
    }

    const code = error.code === 'LIMIT_UNEXPECTED_FILE' ? 'INVALID_FILE_FIELD' : 'INVALID_UPLOAD';
    return res.status(400).json({ error: { code, message: 'Dados de upload inválidos.' } });
  });

  return router;
}

module.exports = { createDocumentRouter };
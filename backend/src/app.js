const express = require('express');
const documentRepository = require('./repositories/documentRepository');
const { createDocumentService } = require('./services/documentService');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRouter } = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const documentService = createDocumentService(documentRepository);
const documentController = createDocumentController(documentService);
const documentRoutes = createDocumentRouter(documentController);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;

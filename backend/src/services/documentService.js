const { randomUUID } = require('node:crypto');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function createDocumentService(repository) {
  return {
    createDocument(file, owner) {
      const document = {
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      };

      repository.save(document);
      return toPublicDocument(document);
    },

    listDocuments(owner) {
      return repository
        .findByOwner(owner)
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
        .map(toPublicDocument);
    },

    findDownloadByOwner(id, owner) {
      return repository.findDownloadByOwner(id, owner);
    },
  };
}

module.exports = { createDocumentService };
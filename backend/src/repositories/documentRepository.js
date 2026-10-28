const fs = require('node:fs');
const path = require('node:path');
const { storageDirectory } = require('../config');

const documents = new Map();

function save(document) {
  documents.set(document.id, { ...document });
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

function findDownloadByOwner(id, owner) {
  const document = documents.get(id);

  if (!document || document.owner !== owner) {
    return null;
  }

  const filePath = path.resolve(storageDirectory, document.storageName);

  if (path.dirname(filePath) !== storageDirectory) {
    return null;
  }

  try {
    if (!fs.statSync(filePath).isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  return { ...document, filePath };
}

module.exports = { save, findByOwner, findDownloadByOwner };
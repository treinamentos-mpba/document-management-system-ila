import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';
import formatFileSize from '../utils/formatFileSize.js';

export default function UploadComponent({ onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const document = await uploadDocument(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploaded(document);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker" htmlFor="document-file">
        <span className="upload-mark" aria-hidden="true">+</span>
        <span className="file-picker-copy">
          <strong>{selectedFile ? 'Trocar arquivo' : 'Selecionar arquivo'}</strong>
          <span>Escolha um arquivo no seu dispositivo</span>
        </span>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          id="document-file"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
          required={!selectedFile}
        />
      </label>

      {selectedFile && (
        <div className="selected-file" aria-live="polite">
          <span className="selected-file-name">{selectedFile.name}</span>
          <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
        </div>
      )}

      {error && <p className="inline-error" role="alert">{error}</p>}

      <button className="primary-button" type="submit" disabled={!selectedFile || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}
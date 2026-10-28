import DownloadButton from './DownloadButton.jsx';
import formatFileSize from '../utils/formatFileSize.js';

function formatUploadDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DocumentList({ documents, isLoading, error }) {
  if (isLoading) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return <p className="inline-error list-state" role="alert">{error}</p>;
  }

  if (documents.length === 0) {
    return <p className="list-state">Nenhum documento enviado.</p>;
  }

  return (
    <ul className="document-list" aria-label="Documentos enviados">
      {documents.map((file) => (
        <li className="document-row" key={file.id}>
          <span className="file-type-mark" aria-hidden="true">DOC</span>
          <div className="document-details">
            <strong className="document-name" title={file.originalName}>{file.originalName}</strong>
            <span className="document-meta">
              {formatFileSize(file.size)} <span aria-hidden="true">·</span> {formatUploadDate(file.uploadedAt)}
            </span>
          </div>
          <DownloadButton file={file} />
        </li>
      ))}
    </ul>
  );
}
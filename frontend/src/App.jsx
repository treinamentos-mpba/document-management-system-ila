import { useEffect, useState } from 'react';
import { listDocuments } from './services/documentApi.js';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      setIsLoading(true);
      setLoadError('');

      try {
        const result = await listDocuments();
        if (isCurrent) {
          setDocuments(result);
        }
      } catch (error) {
        if (isCurrent) {
          setLoadError(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, [refreshToken]);

  function handleUploadComplete(document) {
    setNotice(`${document.originalName} enviado.`);
    setRefreshToken((token) => token + 1);
  }

  function handleRefresh() {
    setNotice('');
    setRefreshToken((token) => token + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="Document Management System">
            <span className="brand-mark" aria-hidden="true">D/</span>
            <span>Document Management System</span>
          </a>
          <span className="topbar-meta">ARQUIVOS LOCAIS <span aria-hidden="true">/</span> 01</span>
        </div>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <p className="eyebrow">WORKSPACE <span aria-hidden="true">/</span> DOCUMENTOS</p>
          <h1>Documentos</h1>
        </div>

        <div className="workspace-grid">
          <section className="upload-section" aria-labelledby="upload-heading">
            <div className="section-heading">
              <span className="section-index">01</span>
              <h2 id="upload-heading">Enviar arquivo</h2>
            </div>
            <UploadComponent onUploaded={handleUploadComplete} />
          </section>

          <section className="library-section" aria-labelledby="documents-heading">
            <div className="section-heading library-heading">
              <span className="section-index">02</span>
              <h2 id="documents-heading">Documentos enviados</h2>
              <span className="document-count" aria-label={`${documents.length} documentos`}>
                {documents.length.toString().padStart(2, '0')}
              </span>
              <button
                className="refresh-button"
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Atualizar
              </button>
            </div>

            {notice && <p className="success-notice" role="status">{notice}</p>}
            <DocumentList documents={documents} isLoading={isLoading} error={loadError} />
          </section>
        </div>
      </main>

      <footer className="page-footer">
        <span>DMS</span>
        <span>ARMAZENAMENTO NO DISCO LOCAL</span>
      </footer>
    </div>
  );
}
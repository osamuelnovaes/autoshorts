import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const API_URL = '/api';

function UploadSection({ onVideoUploaded }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post(`${API_URL}/upload/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          setProgress(Math.round((p.loaded / p.total) * 100));
        }
      });

      onVideoUploaded(response.data.video);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  }, [onVideoUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm']
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
    disabled: uploading
  });

  const handleYoutubeImport = async () => {
    if (!youtubeUrl.trim()) return;

    setUploading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/upload/youtube`, {
        url: youtubeUrl
      });

      onVideoUploaded(response.data.video);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-tabs">
        <button
          className={`upload-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📁 Enviar Arquivo
        </button>
        <button
          className={`upload-tab ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          🔗 Importar YouTube
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <div className="dropzone-icon">🎬</div>
          {isDragActive ? (
            <p>Solte o arquivo aqui...</p>
          ) : (
            <>
              <p>Arraste e solte seu vídeo aqui</p>
              <p className="hint">ou clique para selecionar</p>
              <p className="hint">MP4, MOV ou WebM até 500MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="url-input">
          <input
            type="text"
            placeholder="Cole a URL do YouTube..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={uploading}
          />
          <button
            className="btn"
            onClick={handleYoutubeImport}
            disabled={uploading || !youtubeUrl.trim()}
          >
            {uploading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      )}

      {uploading && (
        <div className="progress-bar">
          <div className="label">
            <span>{activeTab === 'upload' ? 'Enviando...' : 'Importando...'}</span>
            <span>{progress}%</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="error" style={{ color: 'var(--error)', marginTop: '1rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default UploadSection;

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

function Dashboard({ video, onNewVideo }) {
  const [videoData, setVideoData] = useState(video);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingClips, setGeneratingClips] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (videoData.status === 'analyzed') {
      setActiveStep(3);
    } else if (videoData.status === 'clips_generated') {
      setActiveStep(4);
    }
  }, [videoData.status]);

  const analyzeVideo = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/highlights/analyze-full/${videoData.id}`, {
        minDuration: 15,
        maxDuration: 60
      });

      setHighlights(response.data.highlights || []);
      setVideoData({ ...videoData, status: 'analyzed' });
      setActiveStep(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateClips = async () => {
    if (!highlights.length) {
      setError('Execute a análise de AI primeiro');
      return;
    }

    setGeneratingClips(true);
    setError(null);

    try {
      const timestamps = highlights.map(h => ({
        start: h.start,
        end: h.end
      }));

      const response = await axios.post(`${API_URL}/clips/generate/${videoData.id}`, {
        timestamps,
        duration: 30
      });

      setClips(response.data.clips || []);
      setVideoData({ ...videoData, status: 'clips_generated' });
      setActiveStep(4);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setGeneratingClips(false);
    }
  };

  const downloadClip = async (clipId) => {
    try {
      const response = await axios.get(`${API_URL}/download/clip/${clipId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clip_${clipId}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Erro ao baixar clip');
    }
  };

  const downloadAll = async () => {
    try {
      const response = await axios.get(`${API_URL}/download/video/${videoData.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clips_${videoData.id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Erro ao baixar clips');
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dashboard">
      <div className="video-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>{videoData.originalName || 'Vídeo do YouTube'}</h3>
            <p className="meta">
              {videoData.duration ? formatDuration(videoData.duration) : 'Duração desconhecida'}
              <span className="status-badge">{videoData.status}</span>
            </p>
          </div>
          <button className="btn-secondary" onClick={onNewVideo}>
            + Novo Vídeo
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ 
          color: 'var(--error)', 
          marginBottom: '1rem',
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      )}

      <div className="steps-container">
        <div className={`step ${activeStep >= 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <h3>📤 Upload</h3>
          <p>Vídeo carregado com sucesso</p>
          <div className="step-status">✓ Concluído</div>
        </div>

        <div className={`step ${activeStep >= 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <h3>🤖 AI Analysis</h3>
          <p>Detectar melhores momentos</p>
          {activeStep < 2 ? (
            <button
              className="btn"
              onClick={analyzeVideo}
              disabled={analyzing}
            >
              {analyzing ? '⏳ Analisando...' : 'Iniciar Análise'}
            </button>
          ) : (
            <div className="step-status">✓ Concluído</div>
          )}
        </div>

        <div className={`step ${activeStep >= 3 ? 'active' : ''} ${activeStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <h3>✂️ Gerar Clips</h3>
          <p>Criar shorts automaticamente</p>
          {activeStep < 3 ? (
            <button
              className="btn"
              onClick={generateClips}
              disabled={generatingClips || highlights.length === 0}
            >
              {generatingClips ? '⏳ Gerando...' : 'Gerar Clips'}
            </button>
          ) : activeStep === 3 ? (
            <button
              className="btn"
              onClick={generateClips}
              disabled={generatingClips}
            >
              {generatingClips ? '⏳ Gerando...' : 'Gerar Clips'}
            </button>
          ) : (
            <div className="step-status">✓ Concluído</div>
          )}
        </div>

        <div className={`step ${activeStep >= 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <h3>⬇️ Download</h3>
          <p>Exportar seus shorts</p>
          {clips.length > 0 ? (
            <button className="btn" onClick={downloadAll}>
              ⬇️ Baixar Todos
            </button>
          ) : (
            <div className="step-status">Aguardando clips...</div>
          )}
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="highlights-section">
          <h3>✨ {highlights.length} Highlights Encontrados</h3>
          <div className="highlights-grid">
            {highlights.map((highlight, index) => (
              <div key={highlight.id} className="highlight-card">
                <div className="highlight-header">
                  <span className="highlight-index">#{index + 1}</span>
                  <span className={`highlight-type ${highlight.type}`}>
                    {highlight.type}
                  </span>
                </div>
                <div className="highlight-time">
                  {formatDuration(highlight.start)} - {formatDuration(highlight.end)}
                </div>
                <p className="highlight-reason">{highlight.reason}</p>
                <div className="highlight-score">
                  Score: {highlight.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clips.length > 0 && (
        <div className="clips-section">
          <h3>🎬 {clips.length} Clips Prontos</h3>
          <div className="clips-grid">
            {clips.map((clip, index) => (
              <div key={clip.id} className="clip-card">
                <div className="clip-preview">
                  <div className="clip-icon">🎬</div>
                </div>
                <div className="clip-info">
                  <h4>Clip {index + 1}</h4>
                  <p>{formatDuration(clip.duration)}</p>
                  <button 
                    className="btn-small"
                    onClick={() => downloadClip(clip.id)}
                  >
                    ⬇️ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn full-width" onClick={downloadAll}>
            ⬇️ Baixar Todos os Clips (ZIP)
          </button>
        </div>
      )}

      <style>{`
        .btn-secondary {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: var(--bg-card);
        }
        .steps-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin: 2rem 0;
        }
        .step {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s;
        }
        .step.active {
          border-color: var(--primary);
        }
        .step.completed {
          background: rgba(34, 197, 94, 0.1);
          border-color: var(--success);
        }
        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          font-weight: bold;
        }
        .step.active .step-number {
          background: var(--primary);
        }
        .step.completed .step-number {
          background: var(--success);
        }
        .step h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .step p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .step-status {
          color: var(--success);
          font-size: 0.875rem;
        }
        .highlights-section, .clips-section {
          margin-top: 2rem;
        }
        .highlights-section h3, .clips-section h3 {
          margin-bottom: 1rem;
        }
        .highlights-grid, .clips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .highlight-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1rem;
        }
        .highlight-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .highlight-index {
          font-weight: bold;
        }
        .highlight-type {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          background: rgba(99, 102, 241, 0.2);
          color: var(--primary);
        }
        .highlight-time {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .highlight-reason {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .highlight-score {
          color: var(--success);
          font-size: 0.875rem;
        }
        .clip-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .clip-preview {
          height: 120px;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clip-icon {
          font-size: 3rem;
        }
        .clip-info {
          padding: 1rem;
        }
        .clip-info h4 {
          margin-bottom: 0.25rem;
        }
        .clip-info p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .btn-small {
          padding: 0.5rem 1rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .full-width {
          width: 100%;
        }
        @media (max-width: 768px) {
          .steps-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;

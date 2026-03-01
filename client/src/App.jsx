import { useState } from 'react';
import UploadSection from './components/UploadSection';
import Dashboard from './pages/Dashboard';

function App() {
  const [currentVideo, setCurrentVideo] = useState(null);

  return (
    <div className="container">
      <header className="header">
        <h1>AutoShorts</h1>
        <p>Crie clips automáticos para TikTok, YouTube Shorts e Instagram Reels</p>
      </header>

      <div className="steps">
        <div className={`step ${currentVideo ? 'completed' : ''}`}>
          <div className="step-icon">📤</div>
          <h3>1. Envie seu vídeo</h3>
          <p>Upload ou URL do YouTube</p>
        </div>
        <div className={`step ${currentVideo?.status === 'analyzed' ? 'completed' : currentVideo ? 'active' : ''}`}>
          <div className="step-icon">🤖</div>
          <h3>2. AI detecta highlights</h3>
          <p>Momentos mais interessantes</p>
        </div>
        <div className={`step ${currentVideo?.status === 'clips_generated' ? 'completed' : ''}`}>
          <div className="step-icon">✂️</div>
          <h3>3. Clips gerados</h3>
          <p>Pronto para editar</p>
        </div>
        <div className="step">
          <div className="step-icon">⬇️</div>
          <h3>4. Download</h3>
          <p>Exporte seus shorts</p>
        </div>
      </div>

      {!currentVideo ? (
        <UploadSection onVideoUploaded={setCurrentVideo} />
      ) : (
        <Dashboard video={currentVideo} onNewVideo={() => setCurrentVideo(null)} />
      )}
    </div>
  );
}

export default App;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

import videoRoutes from './routes/videos.js';
import uploadRoutes from './routes/upload.js';
import highlightsRoutes from './routes/highlights.js';
import clipsRoutes from './routes/clips.js';
import captionsRoutes from './routes/captions.js';
import downloadRoutes from './routes/download.js';

app.use('/api/upload', uploadRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/highlights', highlightsRoutes);
app.use('/api/clips', clipsRoutes);
app.use('/api/captions', captionsRoutes);
app.use('/api/download', downloadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      youtube: !!process.env.YOUTUBE_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      assemblyai: !!process.env.ASSEMBLYAI_API_KEY,
      storage: !!(process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID)
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AutoShorts API running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

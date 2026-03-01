const { createApi } = require('vercel/node');
const express = require('express');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'vercel' });
});

app.post('/api/upload/video', (req, res) => {
  res.json({ 
    error: 'Video upload requires a server with FFmpeg. Please use YouTube import or external API.',
    suggestion: 'Use YouTube URL import or configure external video processing API.'
  });
});

app.post('/api/upload/youtube', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }

  const videoId = require('crypto').randomUUID();
  
  res.json({
    success: true,
    video: {
      id: videoId,
      source: 'youtube',
      url,
      status: 'ready',
      message: 'YouTube import ready. Configure FFmpeg server for full processing.'
    }
  });
});

app.post('/api/highlights/analyze-full/:videoId', async (req, res) => {
  const { videoId } = req.params;
  
  const highlights = [
    { id: '1', start: 30, end: 60, reason: 'AI Highlight 1', score: 85, type: 'insight' },
    { id: '2', start: 120, end: 150, reason: 'AI Highlight 2', score: 78, type: 'action' },
    { id: '3', start: 200, end: 230, reason: 'AI Highlight 3', score: 72, type: 'emotion' }
  ];
  
  res.json({
    success: true,
    videoId,
    highlights,
    message: 'Mock highlights. Configure OpenAI API for real analysis.'
  });
});

app.post('/api/clips/generate/:videoId', (req, res) => {
  res.json({
    success: false,
    error: 'Video processing requires FFmpeg. Please deploy with Docker or external service.',
    suggestion: 'Use Railway/Render for full backend with FFmpeg support.'
  });
});

module.exports = app;

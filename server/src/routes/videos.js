import express from 'express';

const router = express.Router();

const videosDb = new Map();

router.get('/', (req, res) => {
  const videos = Array.from(videosDb.values());
  res.json({ videos });
});

router.get('/:id', (req, res) => {
  const video = videosDb.get(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }
  res.json({ video });
});

router.post('/', (req, res) => {
  const { id, originalName, filename, size, status } = req.body;
  const video = {
    id,
    originalName,
    filename,
    size,
    status: status || 'uploaded',
    createdAt: new Date().toISOString()
  };
  videosDb.set(id, video);
  res.json({ video });
});

router.delete('/:id', (req, res) => {
  const deleted = videosDb.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }
  res.json({ success: true, message: 'Vídeo deletado' });
});

export default router;

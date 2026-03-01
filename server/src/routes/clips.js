import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateClip, cleanupTempFiles } from '../services/video.service.js';
import { videosDb } from './upload.js';

const router = express.Router();

const clipsDb = new Map();

router.post('/generate/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { timestamps = [], duration = 30 } = req.body;

    const video = videosDb.get(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    if (!timestamps.length) {
      return res.status(400).json({ error: 'Timestamps são obrigatórios' });
    }

    if (!video.path || !require('fs').existsSync(video.path)) {
      return res.status(400).json({ 
        error: 'Vídeo source não disponível para processamento',
        note: 'Configure o download do YouTube ou faça upload do arquivo'
      });
    }

    const generatedClips = [];
    const tempFiles = [];

    for (const ts of timestamps) {
      const clipId = uuidv4();
      
      try {
        const result = await generateClip(video.path, {
          startTime: ts.start,
          endTime: ts.end,
          clipId,
          videoId
        });

        const clip = {
          id: clipId,
          videoId,
          startTime: ts.start,
          endTime: ts.end,
          duration: result.duration,
          url: result.url,
          outputPath: result.outputPath,
          size: result.size,
          status: 'ready',
          createdAt: new Date().toISOString()
        };

        generatedClips.push(clip);
        tempFiles.push(result.outputPath);
      } catch (clipError) {
        console.error(`Error generating clip ${clipId}:`, clipError);
      }
    }

    clipsDb.set(videoId, generatedClips);

    const updatedVideo = {
      ...video,
      status: 'clips_generated',
      clipsCount: generatedClips.length
    };
    videosDb.set(videoId, updatedVideo);

    res.json({
      success: true,
      clips: generatedClips,
      message: `${generatedClips.length} clips gerados`
    });
  } catch (error) {
    console.error('Clip generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:videoId', (req, res) => {
  const { videoId } = req.params;
  
  const video = videosDb.get(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }

  const clips = clipsDb.get(videoId) || [];

  res.json({
    videoId,
    clips,
    count: clips.length
  });
});

router.get('/clip/:clipId', (req, res) => {
  const { clipId } = req.params;
  
  for (const [videoId, clips] of clipsDb.entries()) {
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      return res.json({ clip, videoId });
    }
  }

  return res.status(404).json({ error: 'Clip não encontrado' });
});

router.delete('/clip/:clipId', (req, res) => {
  const { clipId } = req.params;
  
  for (const [videoId, clips] of clipsDb.entries()) {
    const index = clips.findIndex(c => c.id === clipId);
    if (index !== -1) {
      const [removed] = clips.splice(index, 1);
      
      if (removed.outputPath) {
        try {
          require('fs').unlinkSync(removed.outputPath);
        } catch (e) {
          console.warn('Could not delete clip file:', e.message);
        }
      }
      
      return res.json({ success: true, clip: removed });
    }
  }

  return res.status(404).json({ error: 'Clip não encontrado' });
});

export default router;

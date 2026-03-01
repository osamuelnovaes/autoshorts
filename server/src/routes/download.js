import express from 'express';
import fs from 'fs';
import path from 'path';
import { createZipArchive } from '../services/zip.service.js';
import { clipsDb } from './clips.js';
import { captionsDb } from './captions.js';

const router = express.Router();

router.get('/clip/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { quality = '1080p', withCaptions = 'false' } = req.query;
    
    let clip = null;
    for (const clips of clipsDb.values()) {
      const found = clips.find(c => c.id === clipId);
      if (found) {
        clip = found;
        break;
      }
    }

    if (!clip) {
      return res.status(404).json({ error: 'Clip não encontrado' });
    }

    if (!clip.outputPath || !fs.existsSync(clip.outputPath)) {
      return res.status(404).json({ error: 'Arquivo do clip não encontrado' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="clip_${clipId}.mp4"`);
    
    const fileStream = fs.createReadStream(clip.outputPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { format = 'zip' } = req.query;
    
    const clips = clipsDb.get(videoId) || [];
    
    if (clips.length === 0) {
      return res.status(404).json({ error: 'Nenhum clip encontrado' });
    }

    const validClips = clips.filter(c => c.outputPath && fs.existsSync(c.outputPath));
    
    if (validClips.length === 0) {
      return res.status(404).json({ error: 'Nenhum arquivo disponível para download' });
    }

    if (format === 'list') {
      return res.json({
        videoId,
        clips: validClips.map(c => ({
          id: c.id,
          duration: c.duration,
          size: c.size,
          url: `/api/download/clip/${c.id}`
        }))
      });
    }

    const zipBuffer = await createZipArchive(validClips);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="clips_${videoId}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('Bulk download error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/captions/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { format = 'srt' } = req.query;
    
    const caption = captionsDb.get(clipId);
    
    if (!caption) {
      return res.status(404).json({ error: 'Legendas não encontradas' });
    }

    const { exportCaptionsSRT, exportCaptionsVTT } = await import('../services/caption.service.js');
    
    let content;
    let contentType;
    let extension;

    if (format === 'vtt') {
      content = exportCaptionsVTT(caption.captions);
      contentType = 'text/vtt';
      extension = 'vtt';
    } else {
      content = exportCaptionsSRT(caption.captions);
      contentType = 'text/plain';
      extension = 'srt';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="captions_${clipId}.${extension}"`);
    res.send(content);
  } catch (error) {
    console.error('Caption download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

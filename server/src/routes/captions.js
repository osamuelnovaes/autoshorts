import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio, generateCaptions, exportCaptionsSRT, exportCaptionsVTT } from '../services/caption.service.js';
import { clipsDb } from './clips.js';
import { videosDb } from './upload.js';

const router = express.Router();

const captionsDb = new Map();

router.post('/generate/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { style = 'default' } = req.body;

    let clip = null;
    let videoId = null;

    for (const [vId, clips] of clipsDb.entries()) {
      const found = clips.find(c => c.id === clipId);
      if (found) {
        clip = found;
        videoId = vId;
        break;
      }
    }

    if (!clip) {
      return res.status(404).json({ error: 'Clip não encontrado' });
    }

    const audioUrl = clip.url;
    
    const transcriptResult = await transcribeAudio(audioUrl);
    
    const captionsResult = generateCaptions(
      transcriptResult.transcript || [],
      style
    );

    const captionData = {
      id: uuidv4(),
      clipId,
      videoId,
      captions: captionsResult.captions,
      style: captionsResult.style,
      transcript: transcriptResult.text,
      metadata: captionsResult.metadata,
      createdAt: new Date().toISOString()
    };

    captionsDb.set(clipId, captionData);

    res.json({
      success: true,
      clipId,
      captions: captionData.captions,
      style: captionData.style,
      message: `${captionData.captions.length} legendas geradas`
    });
  } catch (error) {
    console.error('Caption generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:clipId', (req, res) => {
  const { clipId } = req.params;
  
  const caption = captionsDb.get(clipId);
  
  if (!caption) {
    return res.status(404).json({ error: 'Legendas não encontradas' });
  }

  res.json({ caption });
});

router.get('/export/:clipId', (req, res) => {
  const { clipId } = req.params;
  const { format = 'srt' } = req.query;
  
  const caption = captionsDb.get(clipId);
  
  if (!caption) {
    return res.status(404).json({ error: 'Legendas não encontradas' });
  }

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
  res.setHeader('Content-Disposition', `attachment; filename="captions.${extension}"`);
  res.send(content);
});

router.put('/:clipId', (req, res) => {
  const { clipId } = req.params;
  const { captions, style } = req.body;
  
  const existingCaption = captionsDb.get(clipId);
  
  if (!existingCaption) {
    return res.status(404).json({ error: 'Legendas não encontradas' });
  }

  const updatedCaption = {
    ...existingCaption,
    captions: captions || existingCaption.captions,
    style: style || existingCaption.style,
    editedAt: new Date().toISOString()
  };

  captionsDb.set(clipId, updatedCaption);

  res.json({
    success: true,
    caption: updatedCaption
  });
});

export default router;

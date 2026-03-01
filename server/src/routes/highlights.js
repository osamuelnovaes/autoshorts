import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { analyzeVideoForHighlights, analyzeClipQuality } from '../services/ai.service.js';
import { getVideoMetadata, getTranscript } from '../services/youtube.service.js';
import { videosDb } from './upload.js';

const router = express.Router();

const highlightsDb = new Map();

router.post('/analyze/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { minDuration = 15, maxDuration = 60 } = req.body;

    const video = videosDb.get(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    res.json({
      success: true,
      message: 'Análise iniciada. Este é um endpoint de demonstração.',
      videoId,
      note: 'Configure OPENAI_API_KEY para análise real com AI'
    });
  } catch (error) {
    console.error('Highlight analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/analyze-full/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { minDuration = 15, maxDuration = 60 } = req.body;

    const video = videosDb.get(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    let videoMetadata = null;
    let transcript = null;

    if (video.source === 'youtube' && video.youtubeId) {
      try {
        videoMetadata = await getVideoMetadata(video.youtubeId);
        const transcriptResult = await getTranscript(video.youtubeId);
        if (transcriptResult.success) {
          transcript = transcriptResult.transcript;
        }
      } catch (e) {
        console.warn('Could not fetch YouTube data:', e.message);
      }
    }

    const videoData = {
      videoMetadata,
      transcript,
      duration: video.duration || videoMetadata?.duration || 0
    };

    const highlights = await analyzeVideoForHighlights(videoData);

    const filteredHighlights = highlights
      .filter(h => {
        const duration = h.end - h.start;
        return duration >= minDuration && duration <= maxDuration;
      })
      .map(h => ({
        ...h,
        id: uuidv4(),
        videoId,
        createdAt: new Date().toISOString()
      }));

    highlightsDb.set(videoId, filteredHighlights);

    const updatedVideo = {
      ...video,
      status: 'analyzed',
      highlightsCount: filteredHighlights.length
    };
    videosDb.set(videoId, updatedVideo);

    res.json({
      success: true,
      videoId,
      highlights: filteredHighlights,
      video: updatedVideo,
      message: `Encontrados ${filteredHighlights.length} highlights`
    });
  } catch (error) {
    console.error('Full analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:videoId', (req, res) => {
  const { videoId } = req.params;
  
  const video = videosDb.get(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }

  const highlights = highlightsDb.get(videoId) || [];

  res.json({
    videoId,
    highlights,
    count: highlights.length
  });
});

router.post('/quality/:highlightId', async (req, res) => {
  try {
    const { highlightId } = req.params;
    const { clipData } = req.body;

    const quality = await analyzeClipQuality(clipData);

    res.json({
      success: true,
      highlightId,
      quality
    });
  } catch (error) {
    console.error('Quality analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { uploadToStorage } from '../services/storage.service.js';
import { extractVideoId, getVideoMetadata, downloadVideo, getTranscript } from '../services/youtube.service.js';
import { analyzeVideoForHighlights } from '../services/ai.service.js';
import { getVideoDuration, generateClip, cleanupTempFiles } from '../services/video.service.js';

const router = express.Router();

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const MAX_SIZE = 500 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo não permitido: ${file.mimetype}. Use: MP4, MOV, WebM`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter
});

const videosDb = new Map();

router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const videoId = uuidv4();
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const size = req.file.size;

    let duration = 0;
    try {
      duration = await getVideoDuration(filePath);
    } catch (e) {
      console.warn('Could not get video duration:', e.message);
    }

    const videoData = {
      id: videoId,
      originalName,
      filename: req.file.filename,
      path: filePath,
      size,
      mimeType: req.file.mimetype,
      duration,
      status: 'uploaded',
      source: 'upload',
      createdAt: new Date().toISOString()
    };

    videosDb.set(videoId, videoData);

    res.json({
      success: true,
      video: videoData,
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL do YouTube é obrigatória' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'URL do YouTube inválida' });
    }

    const metadata = await getVideoMetadata(videoId);
    
    const videoData = {
      id: uuidv4(),
      youtubeId: videoId,
      originalName: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      channelTitle: metadata.channelTitle,
      source: 'youtube',
      url,
      status: 'ready',
      createdAt: new Date().toISOString()
    };

    videosDb.set(videoData.id, videoData);

    res.json({
      success: true,
      video: videoData,
      message: 'YouTube video ready for processing'
    });
  } catch (error) {
    console.error('YouTube import error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const video = videosDb.get(videoId);
  
  if (!video) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }

  res.json({ video });
});

router.delete('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const video = videosDb.get(videoId);
  
  if (!video) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }

  if (video.path && fs.existsSync(video.path)) {
    try {
      fs.unlinkSync(video.path);
    } catch (e) {
      console.warn('Could not delete video file:', e.message);
    }
  }

  videosDb.delete(videoId);
  
  res.json({ success: true, message: 'Vídeo deletado' });
});

export { router as uploadRoutes, videosDb };

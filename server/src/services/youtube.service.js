import { Readable } from 'stream';
import fetch from 'node:fetch';
import { uploadToStorage } from './storage.service.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const getVideoMetadata = async (videoId) => {
  if (!YOUTUBE_API_KEY) {
    return getVideoMetadataFallback(videoId);
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(`YouTube API Error: ${data.error.message}`);
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }

  const video = data.items[0];
  
  const parseDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  return {
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
    duration: parseDuration(video.contentDetails.duration),
    channelTitle: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    viewCount: video.statistics?.viewCount || 0,
    likeCount: video.statistics?.likeCount || 0
  };
};

const getVideoMetadataFallback = async (videoId) => {
  return {
    id: videoId,
    title: `Video ${videoId}`,
    description: '',
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    duration: 0,
    channelTitle: 'Unknown Channel',
    publishedAt: new Date().toISOString(),
    viewCount: 0,
    likeCount: 0,
    note: 'Using fallback metadata. Configure YOUTUBE_API_KEY for full data.'
  };
};

export const downloadVideo = async (videoId) => {
  console.log(`📥 Downloading video ${videoId}...`);
  
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY in environment variables.');
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const videoMetadata = await getVideoMetadata(videoId);
  
  return {
    success: true,
    videoId,
    metadata: videoMetadata,
    downloadUrl: videoUrl,
    message: 'Video metadata retrieved. Actual download requires youtubei.js or yt-dlp.'
  };
};

export const getTranscript = async (videoId) => {
  try {
    const response = await fetch(`https://youtubetranscript.dev/api/v2/transcribe?video_id=${videoId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.YOUTUBE_TRANSCRIPT_API_KEY || ''}`
      }
    });

    if (!response.ok) {
      throw new Error('Transcript not available');
    }

    const data = await response.json();
    return {
      success: true,
      transcript: data.transcript || data
    };
  } catch (error) {
    console.error('Transcript Error:', error);
    return {
      success: false,
      transcript: [],
      error: error.message
    };
  }
};

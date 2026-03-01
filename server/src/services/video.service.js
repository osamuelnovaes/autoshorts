import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { uploadToStorage, getPublicUrl } from './storage.service.js';

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export const extractAudio = async (videoPath, videoId) => {
  const outputPath = path.join(OUTPUT_DIR, `${videoId}_audio.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
};

export const generateThumbnails = async (videoPath, videoId, count = 5) => {
  const thumbnails = [];
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('filenames', (filenames) => {
        thumbnails.push(...filenames.map(f => path.join(OUTPUT_DIR, f)));
      })
      .on('end', () => resolve(thumbnails))
      .on('error', (err) => reject(err))
      .screenshots({
        count,
        folder: OUTPUT_DIR,
        filename: `${videoId}_thumb_%02i.jpg`,
        size: '320x180'
      });
  });
};

export const getVideoDuration = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration || 0);
      }
    });
  });
};

export const generateClip = async (videoPath, clipData) => {
  const { startTime, endTime, clipId, videoId } = clipData;
  const duration = endTime - startTime;
  
  const outputFileName = `clip_${clipId || uuidv4()}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoFilters([
        'scale=1080:1920:force_original_aspect_ratio=decrease',
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        'setsar=1'
      ])
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('end', async () => {
        try {
          const fileBuffer = fs.readFileSync(outputPath);
          const result = await uploadToStorage(fileBuffer, outputFileName, 'video/mp4');
          
          resolve({
            success: true,
            clipId: clipId || uuidv4(),
            outputPath,
            url: result.url || result.local ? outputPath : null,
            duration,
            size: fs.statSync(outputPath).size
          });
        } catch (uploadError) {
          resolve({
            success: true,
            clipId: clipId || uuidv4(),
            outputPath,
            url: outputPath,
            duration,
            size: fs.statSync(outputPath).size,
            uploadError: uploadError.message
          });
        }
      })
      .on('error', (err) => reject(err))
      .run();
  });
};

export const addCaptionsToVideo = async (clipPath, captionsData, outputName) => {
  const { subtitles, style } = captionsData;
  
  const outputFileName = outputName || `captioned_${uuidv4()}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  const fontSize = style?.fontSize || 24;
  const fontColor = style?.fontColor || 'white';
  const backgroundColor = style?.backgroundColor || 'black@0.5';
  const position = style?.position || 'bottom';

  const yPosition = position === 'bottom' ? 'h-th-50' : '50';

  const subtitlesFilter = subtitles.map((sub, i) => {
    const startTime = formatTime(sub.startTime);
    const endTime = formatTime(sub.endTime);
    return `drawtext=text='${sub.text}':fontfile=/System/Library/Fonts/Helvetica.ttc:fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${backgroundColor}:boxborderw=10:x=(w-text_w)/2:y=${yPosition}:enable='between(t,${startTime},${endTime})'`;
  }).join(',');

  return new Promise((resolve, reject) => {
    const command = ffmpeg(clipPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23']);

    if (subtitlesFilter) {
      command.videoFilters(subtitlesFilter);
    }

    command
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
};

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const createHighlightReel = async (clips, outputName) => {
  const outputFileName = outputName || `reel_${uuidv4()}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  const clipListFile = path.join(OUTPUT_DIR, `clip_list_${uuidv4()}.txt`);
  
  const listContent = clips.map(clip => `file '${clip.path}'`).join('\n');
  fs.writeFileSync(clipListFile, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(clipListFile)
      .inputFormat('concat')
      .safe(0)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
      .output(outputPath)
      .on('end', () => {
        fs.unlinkSync(clipListFile);
        resolve(outputPath);
      })
      .on('error', (err) => {
        if (fs.existsSync(clipListFile)) {
          fs.unlinkSync(clipListFile);
        }
        reject(err);
      })
      .run();
  });
};

export const cleanupTempFiles = async (files) => {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (err) {
      console.error(`Failed to delete ${file}:`, err);
    }
  }
};

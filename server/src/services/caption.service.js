import AssemblyAI from 'assemblyai';
import { v4 as uuidv4 } from 'uuid';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

let assemblyai = null;
if (ASSEMBLYAI_API_KEY) {
  assemblyai = new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY });
}

export const transcribeAudio = async (audioUrl) => {
  if (!assemblyai) {
    console.warn('⚠️ AssemblyAI not configured. Using mock transcription.');
    return generateMockTranscript();
  }

  try {
    const transcript = await assemblyai.transcripts.transcribe({
      audio_url: audioUrl,
      speaker_labels: true,
      auto_chapters: true,
      entity_detection: true,
      iab_categories: true
    });

    if (transcript.status === 'completed') {
      return {
        success: true,
        transcript: transcript.words,
        text: transcript.text,
        chapters: transcript.chapters || [],
        confidence: transcript.confidence || 0
      };
    } else if (transcript.status === 'error') {
      throw new Error(transcript.error);
    }

    return {
      success: true,
      id: transcript.id,
      status: transcript.status,
      message: 'Transcription in progress'
    };
  } catch (error) {
    console.error('AssemblyAI Transcription Error:', error);
    return {
      success: false,
      error: error.message,
      transcript: generateMockTranscript().transcript
    };
  }
};

export const getTranscription = async (transcriptId) => {
  if (!assemblyai) {
    return {
      success: false,
      error: 'AssemblyAI not configured'
    };
  }

  try {
    const transcript = await assemblyai.transcripts.get(transcriptId);
    
    if (transcript.status === 'completed') {
      return {
        success: true,
        transcript: transcript.words,
        text: transcript.text
      };
    }

    return {
      success: true,
      status: transcript.status,
      message: 'Transcription in progress'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const generateCaptions = (transcriptWords, style = 'default') => {
  if (!transcriptWords || transcriptWords.length === 0) {
    return generateMockCaptions();
  }

  const styles = {
    default: {
      fontSize: 24,
      fontColor: 'white',
      backgroundColor: 'black@0.5',
      position: 'bottom'
    },
    modern: {
      fontSize: 28,
      fontColor: '#FFD700',
      backgroundColor: 'black@0.6',
      position: 'bottom'
    },
    minimal: {
      fontSize: 20,
      fontColor: 'white',
      backgroundColor: 'transparent',
      position: 'bottom'
    },
    bold: {
      fontSize: 32,
      fontColor: 'yellow',
      backgroundColor: 'black@0.7',
      position: 'center'
    }
  };

  const selectedStyle = styles[style] || styles.default;

  const captions = [];
  const wordsPerCaption = 8;
  const maxDuration = 5;

  for (let i = 0; i < transcriptWords.length; i += wordsPerCaption) {
    const chunk = transcriptWords.slice(i, i + wordsPerCaption);
    
    if (chunk.length === 0) continue;

    const startTime = chunk[0].start / 1000;
    const endTime = Math.min(
      chunk[chunk.length - 1].end / 1000,
      startTime + maxDuration
    );

    captions.push({
      id: uuidv4(),
      startTime,
      endTime,
      text: chunk.map(w => w.text).join(' '),
      confidence: chunk.reduce((acc, w) => acc + (w.confidence || 0), 0) / chunk.length
    });
  }

  return {
    success: true,
    captions,
    style: selectedStyle,
    metadata: {
      totalWords: transcriptWords.length,
      totalCaptions: captions.length,
      duration: captions[captions.length - 1]?.endTime || 0
    }
  };
};

export const exportCaptionsSRT = (captions) => {
  return captions.map((caption, index) => {
    const startTime = formatSRTTime(caption.startTime);
    const endTime = formatSRTTime(caption.endTime);
    return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
  }).join('\n');
};

export const exportCaptionsVTT = (captions) => {
  const header = 'WEBVTT\n\n';
  const body = captions.map((caption) => {
    const startTime = formatVTTTime(caption.startTime);
    const endTime = formatVTTTime(caption.endTime);
    return `${startTime} --> ${endTime}\n${caption.text}\n`;
  }).join('\n');
  
  return header + body;
};

const formatSRTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

const formatVTTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const generateMockTranscript = () => {
  const words = [];
  const numWords = 50;
  const duration = 30;
  
  for (let i = 0; i < numWords; i++) {
    words.push({
      text: `word_${i}`,
      start: (i / numWords) * duration * 1000,
      end: ((i + 1) / numWords) * duration * 1000,
      confidence: 0.9
    });
  }

  return {
    success: true,
    transcript: words,
    text: 'Mock transcript for testing purposes. Configure AssemblyAI for real transcription.'
  };
};

const generateMockCaptions = () => {
  const captions = [];
  const numCaptions = 5;
  
  for (let i = 0; i < numCaptions; i++) {
    captions.push({
      id: uuidv4(),
      startTime: i * 5,
      endTime: (i + 1) * 5,
      text: `Caption ${i + 1}: Configure AssemblyAI for real captions`,
      confidence: 0.5
    });
  }

  return {
    success: true,
    captions,
    style: styles?.default || {
      fontSize: 24,
      fontColor: 'white',
      backgroundColor: 'black@0.5',
      position: 'bottom'
    }
  };
};

const styles = null;

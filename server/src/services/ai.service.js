import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

export const analyzeVideoForHighlights = async (videoData) => {
  if (!openai) {
    console.warn('⚠️ OpenAI not configured. Using mock highlights.');
    return generateMockHighlights(videoData.duration || 300);
  }

  const { transcript, videoMetadata, frames } = videoData;

  const prompt = `You are an expert video analyst. Analyze this video and identify the most engaging moments that would make great short-form content (15-60 seconds) for TikTok, YouTube Shorts, or Instagram Reels.

Consider:
1. High-energy moments (excitement, surprise, humor)
2. Valuable insights or tips
3. Emotional peaks
4. Visual highlights
5. Memorable quotes or statements
6. Action-packed scenes

Video Title: ${videoMetadata?.title || 'Unknown'}
Channel: ${videoMetadata?.channelTitle || 'Unknown'}
Duration: ${videoMetadata?.duration || 0} seconds

${transcript ? `Transcript excerpt:\n${transcript.slice(0, 2000)}` : 'No transcript available'}

Respond with a JSON array of highlights in this format:
[
  {
    "start": 30,
    "end": 75,
    "reason": "Brief explanation of why this moment is engaging",
    "score": 85,
    "type": "insight|humor|action|emotion|valuable"
  }
]

Return ONLY valid JSON, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a video content expert specializing in viral short-form content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = completion.choices[0].message.content;
    const highlights = JSON.parse(content);

    if (Array.isArray(highlights)) {
      return highlights;
    } else if (highlights.highlights) {
      return highlights.highlights;
    }

    return generateMockHighlights(videoMetadata?.duration || 300);
  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
    return generateMockHighlights(videoMetadata?.duration || 300);
  }
};

const generateMockHighlights = (duration) => {
  const highlights = [];
  const numHighlights = Math.min(5, Math.floor(duration / 60));
  
  for (let i = 0; i < numHighlights; i++) {
    const start = Math.floor((duration / numHighlights) * i + 10);
    const end = Math.min(start + 30, duration);
    
    highlights.push({
      start,
      end,
      reason: `Highlight ${i + 1}: Engaging moment detected`,
      score: Math.floor(70 + Math.random() * 25),
      type: ['insight', 'humor', 'action', 'emotion'][Math.floor(Math.random() * 4)]
    });
  }

  return highlights;
};

export const analyzeClipQuality = async (clipData) => {
  if (!openai) {
    return {
      score: 80,
      feedback: 'Mock analysis - configure OpenAI for real analysis',
      suggestions: []
    };
  }

  const prompt = `Analyze this video clip and provide quality feedback:

Clip Duration: ${clipData.duration} seconds
Clip Start: ${clipData.startTime}
Clip End: ${clipData.endTime}

Provide a JSON response:
{
  "score": 0-100,
  "feedback": "Brief quality assessment",
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Clip analysis error:', error);
    return {
      score: 75,
      feedback: 'Analysis unavailable',
      suggestions: []
    };
  }
};

export const generateClipDescription = async (clipData) => {
  if (!openai) {
    return 'Check out this amazing clip!';
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a social media expert. Create engaging descriptions for short video clips.'
        },
        {
          role: 'user',
          content: `Create a catchy description for a ${clipData.duration}s TikTok/Shorts clip about: ${clipData.reason}`
        }
      ],
      max_tokens: 100
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Description generation error:', error);
    return 'Check out this amazing clip!';
  }
};

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Enable CORS for Figma plugin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

app.use('/api/generate', limiter);

// GROQ API key from environment variables ONLY
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// POST endpoint for copy generation
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, tone } = req.body;

    if (!prompt || !tone) {
      return res.status(400).json({ error: 'Missing prompt or tone' });
    }

    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Prompt too long (max 500 characters)' });
    }

    const toneDescriptions = {
      'neutral': 'Neutral/Functional tone: Clear, invisible, and efficient.',
      'empathetic': 'Empathetic tone: Supportive and understanding.',
      'encouraging': 'Encouraging/Playful tone: Positive and motivating.',
      'direct': 'Direct/Concise tone: Minimum character count.',
      'Professional': 'Professional tone: Educational and clear.'
    };

    const systemPrompt = `Act as a Senior UX Writer. Provide 5 distinct copy variations in ${toneDescriptions[tone]}

UX Principles:
- Clarity over Cleverness
- Progressive Disclosure  
- 6th-8th grade reading level
- Action-Oriented

Output Format: JSON array only:
["option 1", "option 2", "option 3", "option 4", "option 5"]`;

const response = await fetch('https://copy-engine-chi.vercel.app/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'your user input here',
    tone: 'neutral'
  })
});



    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let options;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      options = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      options = content.split('\n').filter(line => line.trim()).slice(0, 5);
    }

    res.json({ success: true, options: options });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate copy' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CopyEngine API' });
});

// Export for Vercel
module.exports = app;
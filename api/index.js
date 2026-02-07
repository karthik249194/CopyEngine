// server.js - Simple Express backend for CopyEngine
// Deploy this to Vercel, Railway, or any Node.js host

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Enable CORS for Figma plugin - FIXED to include OPTIONS
app.use(cors({
  origin: '*', // Figma plugins need wildcard
  methods: ['GET', 'POST', 'OPTIONS'], // Added GET and OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/generate', limiter);

// Your GROQ API key (keep this secret on server)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// POST endpoint for copy generation
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, tone } = req.body;

    // Validate input
    if (!prompt || !tone) {
      return res.status(400).json({ 
        error: 'Missing prompt or tone' 
      });
    }

    // Validate prompt length (prevent abuse)
    if (prompt.length > 500) {
      return res.status(400).json({ 
        error: 'Prompt too long (max 500 characters)' 
      });
    }

    // Build system prompt
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

    // Call GROQ API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User Scenario: ${prompt}` }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse response
    let options;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      options = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      options = content.split('\n').filter(line => line.trim()).slice(0, 5);
    }

    // Return results
    res.json({ 
      success: true, 
      options: options 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate copy' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CopyEngine API' });
});

// Start server
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CopyEngine API' });
});

// Export for Vercel serverless
module.exports = app;
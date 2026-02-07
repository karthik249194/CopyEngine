export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
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
  
      // Call GROQ API directly with fetch
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
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
        console.error('Groq API error:', error); // Add this line
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
  
      res.status(200).json({ success: true, options: options });
  
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate copy' });
    }
  }
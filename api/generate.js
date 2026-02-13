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

    // ============================================
    // LENGTH-AWARE GENERATION - NEW FEATURE
    // ============================================
    
    // Calculate character count for length-aware responses
    const promptLength = prompt.length;
    let lengthGuidance = '';
    
    if (promptLength <= 20) {
      // Very short input - micro-copy (buttons, labels, tags)
      lengthGuidance = `CRITICAL: The user's input is only ${promptLength} characters. Generate VERY SHORT alternatives (10-25 characters max). Examples: button labels, tags, status messages, short CTAs. Keep it ultra-concise.`;
    } else if (promptLength <= 50) {
      // Short input - concise copy (error messages, tooltips)
      lengthGuidance = `The user's input is ${promptLength} characters. Generate SHORT alternatives (30-60 characters max). Keep responses brief and punchy.`;
    } else if (promptLength <= 100) {
      // Medium input - normal copy (notifications, descriptions)
      lengthGuidance = `The user's input is ${promptLength} characters. Generate alternatives around the same length (50-120 characters). Match the original length roughly.`;
    } else {
      // Long input - detailed copy (paragraphs, explanations)
      lengthGuidance = `The user's input is ${promptLength} characters. Generate detailed alternatives (100-200 characters). Provide comprehensive variations.`;
    }

    // Build system prompt with tone descriptions
    const toneDescriptions = {
      'neutral': 'Neutral/Functional tone: Clear, invisible, and efficient.',
      'empathetic': 'Empathetic tone: Supportive and understanding.',
      'encouraging': 'Encouraging/Playful tone: Positive and motivating.',
      'direct': 'Direct/Concise tone: Minimum character count.',
      'Professional': 'Professional tone: Educational and clear.'
    };

    const systemPrompt = `Act as a Senior UX Writer. Provide 5 distinct copy variations in ${toneDescriptions[tone]}

${lengthGuidance}

UX Principles:
- Clarity over Cleverness
- Progressive Disclosure  
- 6th-8th grade reading level
- Action-Oriented

IMPORTANT: Match the input length! If input is 15 characters, outputs should be 10-25 characters. If input is 100 characters, outputs should be 80-120 characters.

Output Format: JSON array only:
["option 1", "option 2", "option 3", "option 4", "option 5"]

No preamble, no explanation.`;

    // ============================================
    // FEW-SHOT LEARNING FOR MICRO-COPY
    // ============================================
    
    // Build messages array with examples for very short inputs
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add few-shot examples for micro-copy (<=20 chars) to guide the model
    if (promptLength <= 20) {
      messages.push(
        { role: 'user', content: 'User Scenario: Save' },
        { role: 'assistant', content: '["Save", "Save changes", "Save now", "Keep changes", "Confirm"]' },
        { role: 'user', content: 'User Scenario: Delete account' },
        { role: 'assistant', content: '["Delete account", "Remove account", "Close account", "Delete profile", "Cancel account"]' }
      );
    }

    // Add user's actual prompt
    messages.push({ role: 'user', content: `User Scenario: ${prompt}` });

    // ============================================
    // CALL GROQ API
    // ============================================
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: promptLength <= 20 ? 150 : 1024  // Token limiting for efficiency
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Groq API error:', error);
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // ============================================
    // PARSE RESPONSE
    // ============================================
    
    let options;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      options = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      options = content.split('\n').filter(line => line.trim()).slice(0, 5);
    }

    // ============================================
    // POST-PROCESSING: FILTER TOO-LONG OPTIONS
    // ============================================
    
    if (promptLength <= 20) {
      // For micro-copy, reject options longer than 3x the input
      const maxLength = Math.max(30, promptLength * 3);
      const filteredOptions = options.filter(opt => opt.length <= maxLength);
      
      // If we filtered too many, use originals but log warning
      if (filteredOptions.length >= 3) {
        options = filteredOptions;
        console.log(`✂️ Filtered ${options.length - filteredOptions.length} options that were too long`);
      } else {
        console.log(`⚠️ Not enough short options, keeping all results`);
      }
    }

    // Ensure we have at least 5 options (pad if needed)
    while (options.length < 5 && options.length > 0) {
      options.push(options[0]); // Duplicate first option if needed
    }

    // Fallback if completely empty
    if (options.length === 0) {
      options = [prompt, prompt, prompt, prompt, prompt];
      console.log(`⚠️ No valid options generated, using input as fallback`);
    }

    // ============================================
    // RETURN RESULTS WITH METADATA
    // ============================================
    
    const finalOptions = options.slice(0, 5); // Ensure exactly 5 options
    const outputLengths = finalOptions.map(opt => opt.length);
    const avgOutputLength = Math.round(outputLengths.reduce((sum, len) => sum + len, 0) / outputLengths.length);

    // Log performance metrics
    console.log(`📊 Input: ${promptLength} chars | Avg Output: ${avgOutputLength} chars | Ratio: ${(avgOutputLength / promptLength).toFixed(2)}x`);

    res.status(200).json({ 
      success: true, 
      options: finalOptions,
      metadata: {
        inputLength: promptLength,
        outputLengths: outputLengths,
        averageOutputLength: avgOutputLength,
        lengthRatio: parseFloat((avgOutputLength / promptLength).toFixed(2))
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate copy' 
    });
  }
}
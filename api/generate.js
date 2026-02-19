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
    // LENGTH CALCULATION
    // ============================================
    
    const promptLength = prompt.length;
    
    // Calculate length ranges based on input
    const minLength = promptLength; // Minimum = input length
    const maxLength = Math.min(promptLength * 2, promptLength + 20); // Max = 2x input or +20 chars
    
    // ============================================
    // TONE-SPECIFIC SYSTEM PROMPTS (3 TONES)
    // ============================================
    
    let systemPrompt = '';
    
    if (tone === 'neutral') {
      // ============================================
      // SHORT & SIMPLE - STRICT LENGTH CONSTRAINTS
      // ============================================
      
      let lengthGuidance = '';
      
      if (promptLength <= 20) {
        lengthGuidance = `CRITICAL: Input is ${promptLength} characters. Generate ULTRA-SHORT alternatives (${minLength}-${Math.min(maxLength, 25)} characters MAXIMUM). Examples: button labels, tags, status. Keep it minimal.`;
      } else if (promptLength <= 50) {
        lengthGuidance = `Input is ${promptLength} characters. Generate SHORT alternatives (${minLength}-${maxLength} characters). Brief and punchy.`;
      } else if (promptLength <= 100) {
        lengthGuidance = `Input is ${promptLength} characters. Generate concise alternatives (${minLength}-${maxLength} characters).`;
      } else {
        lengthGuidance = `Input is ${promptLength} characters. Generate alternatives (${minLength}-${maxLength} characters).`;
      }

      systemPrompt = `Act as a UX Writer focused on BREVITY and CLARITY.

${lengthGuidance}

Tone: Short & Simple
- Use minimum words possible
- Clear and direct
- No embellishment
- Functional and efficient
- Get straight to the point
- Examples: "Save", "Delete", "Confirm", "Done", "Cancel"

STRICT REQUIREMENT: Output length must be between ${minLength}-${maxLength} characters. NO EXCEPTIONS.

Output Format: JSON array only:
["option 1", "option 2", "option 3", "option 4", "option 5"]

No preamble or explanation.`;

    } else if (tone === 'empathetic') {
      // ============================================
      // EMPATHETIC - WARM & SUPPORTIVE
      // ============================================
      
      systemPrompt = `Act as a UX Writer with an EMPATHETIC and SUPPORTIVE tone.

Input length: ${promptLength} characters
Target range: ${minLength}-${maxLength} characters (flexible guideline, can be slightly descriptive)

Tone: Empathetic
- Show understanding and care for the user
- Acknowledge user feelings and situations
- Supportive and reassuring language
- Warm and human connection
- "We're here to help" attitude
- Use phrases like:
  • "We understand..."
  • "Sorry about that..."
  • "Let's fix this together..."
  • "We're here for you..."
  • "Don't worry, we'll help..."

Make the user feel heard and supported. You can be slightly more descriptive to convey empathy and warmth, but stay within reasonable length (${minLength}-${maxLength} chars as guideline, can go up to ${maxLength + 10} if needed for warmth).

Output Format: JSON array only:
["option 1", "option 2", "option 3", "option 4", "option 5"]

No preamble or explanation.`;

    } else if (tone === 'encouraging') {
      // ============================================
      // ENCOURAGING - POSITIVE & MOTIVATING
      // ============================================
      
      systemPrompt = `Act as a UX Writer with an ENCOURAGING and MOTIVATING tone.

Input length: ${promptLength} characters
Target range: ${minLength}-${maxLength} characters (flexible guideline, can be expressive)

Tone: Encouraging
- Positive and uplifting energy
- Motivational and energizing language
- Action-oriented and forward-looking
- Celebrate progress and success
- Enthusiastic but professional
- Use phrases like:
  • "Great job!"
  • "You're all set!"
  • "Let's go!"
  • "Almost there!"
  • "Nice work!"
  • "You did it!"
  • "Perfect!"

Make the user feel good about their action and motivated to continue. You can be more expressive and positive, using ${minLength}-${maxLength} characters as a guideline (can go up to ${maxLength + 10} for expressiveness).

Output Format: JSON array only:
["option 1", "option 2", "option 3", "option 4", "option 5"]

No preamble or explanation.`;

    } else {
      // Fallback to neutral if invalid tone provided
      systemPrompt = `Act as a UX Writer.

Input length: ${promptLength} characters
Target: ${minLength}-${maxLength} characters

Generate 5 clear, concise variations.

Output Format: JSON array only:
["option 1", "option 2", "option 3", "option 4", "option 5"]`;
    }

    // ============================================
    // FEW-SHOT LEARNING FOR MICRO-COPY
    // ============================================
    
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add tone-specific examples for micro-copy (<=20 chars)
    if (promptLength <= 20) {
      if (tone === 'neutral') {
        // Short & Simple examples - minimal and functional
        messages.push(
          { role: 'user', content: 'User Scenario: Save' },
          { role: 'assistant', content: '["Save", "Save changes", "Keep", "Confirm", "Apply"]' },
          { role: 'user', content: 'User Scenario: Delete account' },
          { role: 'assistant', content: '["Delete account", "Remove account", "Close account", "Delete", "Remove"]' }
        );
      } else if (tone === 'empathetic') {
        // Empathetic examples - warm and understanding
        messages.push(
          { role: 'user', content: 'User Scenario: Error' },
          { role: 'assistant', content: '["Sorry, try again", "Oops, let\'s retry", "Something went wrong", "We\'re sorry", "Let\'s fix this"]' },
          { role: 'user', content: 'User Scenario: Delete' },
          { role: 'assistant', content: '["We\'ll delete this", "Remove safely", "Delete confirmed", "Removing for you", "We\'ll take care of it"]' }
        );
      } else if (tone === 'encouraging') {
        // Encouraging examples - positive and motivating
        messages.push(
          { role: 'user', content: 'User Scenario: Done' },
          { role: 'assistant', content: '["All done!", "Great work!", "Success!", "You did it!", "Complete!"]' },
          { role: 'user', content: 'User Scenario: Submit' },
          { role: 'assistant', content: '["Let\'s go!", "Send it!", "You\'re ready!", "Submit now!", "Perfect!"]' }
        );
      }
    }

    // Add user's actual prompt
    messages.push({ role: 'user', content: `User Scenario: ${prompt}` });

    // ============================================
    // CALL GROQ API
    // ============================================
    
    // Adjust parameters based on tone
    let maxTokens = 1024;
    let temperature = 0.7;
    
    if (tone === 'neutral') {
      // Short & Simple needs fewer tokens and lower temperature for consistency
      maxTokens = promptLength <= 20 ? 100 : 500;
      temperature = 0.5;
    } else {
      // Empathetic and Encouraging can be more creative
      maxTokens = promptLength <= 20 ? 150 : 800;
      temperature = 0.7;
    }
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
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
    // POST-PROCESSING: LENGTH FILTERING
    // ============================================
    
    if (tone === 'neutral') {
      // STRICT filtering for Short & Simple
      const filteredOptions = options.filter(opt => 
        opt.length >= minLength && opt.length <= maxLength
      );
      
      if (filteredOptions.length >= 3) {
        options = filteredOptions;
        console.log(`✂️ Strict filter: Kept ${filteredOptions.length} options within ${minLength}-${maxLength} chars`);
      }
    } else {
      // FLEXIBLE filtering for Empathetic and Encouraging
      const flexibleMax = maxLength + 10; // Allow 10 extra chars for expressiveness
      const filteredOptions = options.filter(opt => 
        opt.length >= minLength && opt.length <= flexibleMax
      );
      
      if (filteredOptions.length >= 3) {
        options = filteredOptions;
        console.log(`✂️ Flexible filter: Kept ${filteredOptions.length} options within ${minLength}-${flexibleMax} chars`);
      }
    }

    // Ensure we have at least 5 options
    while (options.length < 5 && options.length > 0) {
      options.push(options[0]);
    }

    // Fallback if completely empty
    if (options.length === 0) {
      options = [prompt, prompt, prompt, prompt, prompt];
      console.log(`⚠️ No valid options generated, using input as fallback`);
    }

    // ============================================
    // RETURN RESULTS WITH METADATA
    // ============================================
    
    const finalOptions = options.slice(0, 5);
    const outputLengths = finalOptions.map(opt => opt.length);
    const avgOutputLength = Math.round(outputLengths.reduce((sum, len) => sum + len, 0) / outputLengths.length);

    // Log performance metrics with tone info
    console.log(`📊 [${tone.toUpperCase()}] Input: ${promptLength} chars | Avg Output: ${avgOutputLength} chars | Range: ${minLength}-${maxLength} | Ratio: ${(avgOutputLength / promptLength).toFixed(2)}x`);

    res.status(200).json({ 
      success: true, 
      options: finalOptions,
      metadata: {
        tone: tone,
        inputLength: promptLength,
        outputLengths: outputLengths,
        averageOutputLength: avgOutputLength,
        targetRange: `${minLength}-${maxLength}`,
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
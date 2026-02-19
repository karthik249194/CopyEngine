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
    // Per spec:
    //   < 15 chars  → stay within +/- 3 chars
    //   >= 15 chars → max 1.2x original length
    // ============================================

    const promptLength = prompt.length;

    let minLength, maxLength;

    if (promptLength < 15) {
      minLength = Math.max(1, promptLength - 3);
      maxLength = promptLength + 3;
    } else {
      minLength = Math.max(4, Math.round(promptLength * 0.8)); // soft floor at 80%
      maxLength = Math.round(promptLength * 1.2);
    }

    // ============================================
    // TONE DEFINITIONS
    // ============================================

    const toneDefinitions = {
      neutral: {
        label: 'Simple (Neutral)',
        description: 'Functional, direct, and minimalist.',
        example: '"You need to fill out the form to proceed." → "Complete form to continue."',
        instructions: [
          'Use the fewest words possible',
          'Remove filler words and fluff',
          'Action-oriented and direct',
          'No warmth or personality needed — pure function',
        ]
      },
      empathetic: {
        label: 'Empathetic',
        description: 'Supportive and human. Recognizes the user\'s effort or potential frustration.',
        example: '"Invalid password." → "That password isn\'t quite right. Try again?"',
        instructions: [
          'Acknowledge the user\'s situation or feeling',
          'Use warm, human language',
          'Avoid blame — make it feel safe',
          'Supportive and reassuring tone',
        ]
      },
      encouraging: {
        label: 'Encouraging',
        description: 'Positive and motivating. Focuses on progress and successful outcomes.',
        example: '"Profile 50% complete." → "You\'re halfway there! Add a photo to stand out."',
        instructions: [
          'Focus on progress and what\'s possible',
          'Celebrate small wins',
          'Energetic and forward-looking',
          'Make the user feel capable and motivated',
        ]
      }
    };

    const toneConfig = toneDefinitions[tone] || toneDefinitions['neutral'];

    // ============================================
    // SYSTEM PROMPT — ROLE + RULES
    // ============================================

    const systemPrompt = `You are a specialized UX Writer for a Figma plugin. Your task is to rewrite UI copy in a specific tone while respecting spatial constraints.

### Your Role
Rewrite UI copy to match the requested tone, keeping it within the allowed character range.

### Tone: ${toneConfig.label}
${toneConfig.description}
Example: ${toneConfig.example}

Writing Instructions:
${toneConfig.instructions.map(i => `- ${i}`).join('\n')}

### Length Constraint (CRITICAL)
- Original text is ${promptLength} characters
- You MUST generate options between ${minLength} and ${maxLength} characters
- This is a hard limit — do NOT exceed ${maxLength} characters
- Do NOT go below ${minLength} characters

### Output Format
Return a JSON array of exactly 5 options. No quotes around the array, no explanation, no preamble.
["option 1", "option 2", "option 3", "option 4", "option 5"]`;

    // ============================================
    // FEW-SHOT EXAMPLES
    // ============================================

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Tone-specific few-shot examples
    if (tone === 'neutral') {
      messages.push(
        { role: 'user', content: 'Rewrite: "You need to fill out the form to proceed."' },
        { role: 'assistant', content: '["Complete form to continue.", "Fill in the form first.", "Form required to proceed.", "Please complete the form.", "Finish the form to go on."]' },
        { role: 'user', content: 'Rewrite: "Save"' },
        { role: 'assistant', content: '["Save", "Keep", "Apply", "Confirm", "Done"]' }
      );
    } else if (tone === 'empathetic') {
      messages.push(
        { role: 'user', content: 'Rewrite: "Invalid password."' },
        { role: 'assistant', content: '["That password isn\'t quite right. Try again?", "Hmm, that didn\'t match. Give it another go?", "Password didn\'t work — no worries, try again.", "Not quite — double-check and retry.", "That one didn\'t work. Want to try again?"]' },
        { role: 'user', content: 'Rewrite: "Error"' },
        { role: 'assistant', content: '["Oops", "Sorry!", "Uh oh", "My bad", "Whoops"]' }
      );
    } else if (tone === 'encouraging') {
      messages.push(
        { role: 'user', content: 'Rewrite: "Profile 50% complete."' },
        { role: 'assistant', content: '["You\'re halfway there! Add a photo to stand out.", "Great start! Keep going to finish your profile.", "50% done — you\'re on a roll!", "Almost halfway! A few more steps to shine.", "Nice progress! Let\'s keep the momentum going."]' },
        { role: 'user', content: 'Rewrite: "Submit"' },
        { role: 'assistant', content: '["Let\'s go!", "Send it!", "You\'re ready!", "Go for it!", "Do it!"]' }
      );
    }

    // Add the actual user prompt
    messages.push({
      role: 'user',
      content: `Rewrite: "${prompt}"`
    });

    // ============================================
    // CALL GROQ API
    // ============================================

    let maxTokens = 800;
    let temperature = 0.7;

    if (tone === 'neutral') {
      temperature = 0.5; // More predictable for functional copy
      maxTokens = promptLength < 15 ? 100 : 400;
    } else {
      temperature = 0.75; // Slightly more creative for empathetic/encouraging
      maxTokens = promptLength < 15 ? 150 : 600;
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
      console.error('Groq API error:', error);
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

    const filteredOptions = options.filter(opt =>
      typeof opt === 'string' &&
      opt.length >= minLength &&
      opt.length <= maxLength
    );

    // Use filtered if we have enough, otherwise keep all (don't starve the user)
    if (filteredOptions.length >= 3) {
      options = filteredOptions;
    }

    // Pad to 5 if needed
    while (options.length < 5 && options.length > 0) {
      options.push(options[0]);
    }

    // Fallback
    if (options.length === 0) {
      options = [prompt, prompt, prompt, prompt, prompt];
    }

    // ============================================
    // RETURN RESULTS
    // ============================================

    const finalOptions = options.slice(0, 5);
    const outputLengths = finalOptions.map(opt => opt.length);
    const avgOutputLength = Math.round(
      outputLengths.reduce((sum, len) => sum + len, 0) / outputLengths.length
    );

    console.log(`[${tone.toUpperCase()}] Input: ${promptLength} chars | Avg Output: ${avgOutputLength} chars | Range: ${minLength}-${maxLength}`);

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
    console.error('Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate copy'
    });
  }
}
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

    const systemPrompt = `You are a specialized UX Writer for a Figma plugin. Your task is to REWRITE the given UI copy in a specific tone while respecting spatial layout constraints.

### IMPORTANT: What "Rewrite" Means
You must preserve the MEANING and CONTEXT of the original text, but change the tone and phrasing.
- DO: Rephrase the same message in a different tone
- DO NOT: Generate new unrelated placeholder text
- DO NOT: Ignore what the original text is about

### IMPORTANT: Numbers & Special Characters
If the original text contains numbers (e.g. "50%", "$9.99", "3 items") or special characters (e.g. "!", "→", "#", "@"), you MUST include them in your rewrite.
- Numbers and values carry meaning — preserve them
- Example: "Upload failed (2.4 MB limit)" → encouraging: "Almost there! Your file is just over the 2.4 MB limit — try compressing it."
- Do NOT drop numbers or special characters from your rewrites

Example of correct behavior:
- Input: "Your payment could not be processed." (38 chars)
- WRONG encouraging output: "Let's go!" (too short, ignores meaning)  
- CORRECT encouraging output: "Almost there! Double-check your details and try again." (54 chars)

### Tone: ${toneConfig.label}
${toneConfig.description}
Example: ${toneConfig.example}

Writing Instructions:
${toneConfig.instructions.map(i => `- ${i}`).join('\n')}

### Length Constraint (CRITICAL)
- Original text is ${promptLength} characters
- You MUST generate options between ${minLength} and ${maxLength} characters
- Each option MUST be at least ${minLength} characters — short exclamations are NOT acceptable for longer inputs
- Do NOT exceed ${maxLength} characters

### Output Format
Return a JSON array of exactly 5 options. No explanation, no preamble.
["option 1", "option 2", "option 3", "option 4", "option 5"]`;

    // ============================================
    // FEW-SHOT EXAMPLES
    // ============================================

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Tone-specific few-shot examples (short AND long to teach length awareness)
    if (tone === 'neutral') {
      messages.push(
        // Short example
        { role: 'user', content: 'Rewrite: "Save"' },
        { role: 'assistant', content: '["Save", "Keep", "Apply", "Confirm", "Done"]' },
        // Long example — teaches the model to match length
        { role: 'user', content: 'Rewrite: "You need to fill out the form before you can proceed to the next step."' },
        { role: 'assistant', content: '["Complete the form to continue.", "Fill out the form to move forward.", "Form must be completed before proceeding.", "Finish the form to go to the next step.", "All fields required before you can continue."]' }
      );
    } else if (tone === 'empathetic') {
      messages.push(
        // Short example
        { role: 'user', content: 'Rewrite: "Error"' },
        { role: 'assistant', content: '["Oops", "Sorry!", "Uh oh", "My bad", "Whoops"]' },
        // Long example — teaches the model to match length with warmth
        { role: 'user', content: 'Rewrite: "Your payment could not be processed. Please check your details."' },
        { role: 'assistant', content: '["We\'re sorry — your payment didn\'t go through. Let\'s check your details.", "That payment didn\'t work, but we\'re here to help you sort it out.", "No worries! Your payment hit a snag — double-check your info and retry.", "We couldn\'t process that. Take a look at your details and try again.", "Something went wrong with your payment. We\'ll help you get it sorted."]' }
      );
    } else if (tone === 'encouraging') {
      messages.push(
        // Short example
        { role: 'user', content: 'Rewrite: "Submit"' },
        { role: 'assistant', content: '["Let\'s go!", "Send it!", "You\'re ready!", "Go for it!", "Do it!"]' },
        // Long example — teaches the model to match length with positivity
        { role: 'user', content: 'Rewrite: "Your payment could not be processed. Please check your details."' },
        { role: 'assistant', content: '["Almost there! Just check your payment details and try again.", "You\'re so close! A quick look at your details and you\'ll be set.", "Don\'t give up! Update your payment info and let\'s get you through.", "Nearly done — just verify your details and hit submit again!", "One more step! Double-check your payment info and you\'re all set."]' }
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
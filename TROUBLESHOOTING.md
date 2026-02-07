# CopyEngine - Troubleshooting Guide

## Common Error: "Failed to fetch"

This error typically means Figma can't reach the GROQ API. Here are solutions:

### Solution 1: Reload the Plugin

1. In Figma Desktop, go to `Plugins` → `Development`
2. Find "CopyEngine" and click the X to remove it
3. Click `Import plugin from manifest`
4. Select the `manifest.json` file again
5. Try running the plugin again

### Solution 2: Check Network Settings

**In Figma Desktop:**
1. Go to menu bar → `Help` → `View Plugin Console`
2. Look for errors in the console
3. Check if you see "Making API call to GROQ..."

**Network Access:**
- Figma plugins require explicit network permission
- The manifest.json must list allowed domains
- Current setting: `"allowedDomains": ["https://api.groq.com"]`

### Solution 3: Verify API Key

The GROQ API key should:
- Start with `gsk_`
- Be valid and active
- Have proper permissions

**Test your key:**
```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Solution 4: Use Demo Mode

If network issues persist:
1. Enter a scenario
2. Click "Generate Copy"
3. When error appears, click "Try Demo Mode"
4. This uses sample data without API calls

### Solution 5: Check Firewall/Corporate Network

Some networks block external API calls:
- Try on a different network (home vs work)
- Check with IT if corporate firewall blocks api.groq.com
- Try using VPN if allowed

### Solution 6: Alternative - Use Browser Version

If Figma Desktop has network restrictions:
1. Open the `ui.html` file directly in Chrome/Firefox
2. This bypasses Figma's network restrictions
3. You can still test copy generation
4. Copy results manually to Figma

## Debugging Steps

### Step 1: Open Plugin Console
```
Figma → Plugins → Development → Open Console
```

Look for these messages:
- ✅ "Making API call to GROQ..." = Request started
- ✅ "Response status: 200" = Success!
- ❌ "Response status: 401" = Bad API key
- ❌ "Response status: 429" = Rate limit hit
- ❌ "Failed to fetch" = Network blocked

### Step 2: Test with Simple Input

Try this exact input:
```
"Button text for submit"
```

Expected output: 5 variations of submit button copy

### Step 3: Check Console Logs

The plugin logs:
1. API key (first 10 chars)
2. User prompt
3. Full request body
4. Response status
5. Any errors

### Step 4: Verify manifest.json

Your manifest.json should have:
```json
{
  "name": "CopyEngine",
  "networkAccess": {
    "allowedDomains": ["https://api.groq.com"]
  }
}
```

## Error Messages Decoded

### "Failed to fetch"
**Cause:** Network blocked or domain not allowed
**Fix:** Update manifest.json and reload plugin

### "API request failed"
**Cause:** GROQ API returned an error
**Fix:** Check API key, check rate limits

### "No valid options generated"
**Cause:** API response couldn't be parsed
**Fix:** Check console logs for actual response

### "401 Unauthorized"
**Cause:** Invalid API key
**Fix:** Update key in settings, verify it's correct

### "429 Too Many Requests"
**Cause:** Rate limit exceeded
**Fix:** Wait a minute, try again

### "Network error"
**Cause:** Can't reach api.groq.com
**Fix:** Check internet, firewall, network settings

## Quick Fixes Checklist

- [ ] Reload plugin in Figma
- [ ] Check manifest.json has correct domain
- [ ] Verify API key is correct
- [ ] Check Plugin Console for errors
- [ ] Try Demo Mode
- [ ] Test on different network
- [ ] Try browser version of ui.html

## Still Having Issues?

### Option A: Contact Support
- Email GROQ support with your API key
- Ask if there are any restrictions

### Option B: Use Demo Mode
- Works without API
- Uses pre-generated sample data
- Good for testing UI/UX

### Option C: Switch to Different API
If GROQ continues to fail, you can modify the code to use:
- OpenAI API
- Anthropic Claude API
- Google Gemini API
- Local LLM (Ollama)

## Technical Details

### Network Flow
```
Figma Plugin UI
    ↓
fetch() request
    ↓
Figma Network Check (manifest.json)
    ↓
If allowed → api.groq.com
    ↓
GROQ API Response
    ↓
Parse JSON
    ↓
Display Results
```

### Files Involved
- `manifest.json` - Controls network access
- `ui.html` - Makes API calls
- `code.js` - Handles Figma integration

## Success Indicators

You know it's working when:
1. ✅ Loading spinner appears
2. ✅ Console shows "Response status: 200"
3. ✅ 5 result cards appear
4. ✅ Copy buttons work
5. ✅ Click to apply works

## Prevention Tips

1. **Always reload** after manifest.json changes
2. **Check console** before reporting errors
3. **Test with simple inputs** first
4. **Use Demo Mode** to verify UI works
5. **Keep API key secure** (don't commit to git)

---

**Last Updated:** 2025-02-02
**Plugin Version:** 1.0.0
**Supported Models:** llama-3.3-70b-versatile

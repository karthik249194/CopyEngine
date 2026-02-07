# CopyEngine - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Your API Key (2 minutes)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy it (starts with `sk-ant-`)

### Step 2: Install Plugin (2 minutes)
1. Open **Figma Desktop App** (not browser)
2. Go to `Plugins` → `Development` → `Import plugin from manifest`
3. Select the `manifest.json` file from the CopyEngine folder
4. Plugin is now installed!

### Step 3: Configure (1 minute)
1. Run the plugin: `Plugins` → `Development` → `CopyEngine`
2. Click the ⚙️ settings icon
3. Paste your API key
4. Click "Save API Key"

## First Use

### Example 1: Error Message
1. Type: `"User entered wrong password"`
2. Click "Error" context chip (optional)
3. Click "Generate Copy"
4. Get 5 variations:
   - ❌ "Incorrect password. Please try again."
   - 💙 "That password didn't work. No worries—give it another try!"
   - ⚡ "Oops! Try entering your password again."
   - 📝 "Wrong password"
   - 📚 "The password you entered doesn't match. Check for typos and try again."

### Example 2: Success Message
1. Type: `"Profile updated successfully"`
2. Click "Success" context chip
3. Click "Generate Copy"
4. Get 5 variations tailored to success messaging

### Example 3: Apply Directly to Text Layer
1. Select a text layer in Figma
2. Type your scenario
3. Click "Generate Copy"
4. Click "Apply" on your favorite option
5. ✨ Text is instantly updated!

## Pro Tips

### Speed Tip 💨
Select text layers BEFORE generating. The "Apply" button appears automatically, saving you the copy-paste step.

### Context Tip 🎯
Use context chips to guide the AI:
- **Error**: More empathetic
- **Success**: More encouraging  
- **Onboarding**: More instructional
- **Empty State**: More action-oriented

### Workflow Tip 🔄
1. Create text placeholder layers
2. Select all text layers
3. Run CopyEngine
4. Apply different variations to different layers
5. See which resonates best with your design

### Keyboard Tip ⌨️
- `Tab` to focus input field
- `Enter` to generate (when focused)
- `Cmd/Ctrl + V` to paste copied text

## Common Scenarios

| Scenario | Example Input | Context |
|----------|--------------|---------|
| Form validation | "Email format is invalid" | Error |
| Loading state | "Fetching your data" | Neutral |
| First login | "Welcome to the app" | Onboarding |
| Empty inbox | "No messages yet" | Empty State |
| Upload success | "File uploaded" | Success |
| Button CTA | "Sign up for free trial" | Action |
| Confirmation | "Are you sure you want to delete?" | Neutral |
| Tooltip | "Explain what this feature does" | Instructional |

## Troubleshooting

**Problem**: "Please set your API key in settings"  
**Solution**: Click ⚙️ and enter your Anthropic API key

**Problem**: Generation is slow  
**Solution**: Normal - Claude takes 1-2 seconds. Check your internet connection.

**Problem**: Can't apply to text layer  
**Solution**: Make sure you've selected a TEXT layer (not a frame or group)

**Problem**: API key won't save  
**Solution**: Make sure you're using Figma Desktop App, not browser

## Next Steps

- Bookmark your favorite variations
- Create a text style system
- Share the plugin with your team
- Experiment with different scenarios
- Track time saved vs manual copywriting

## Support

- Read the full [README.md](README.md) for technical details
- Check [Anthropic's API docs](https://docs.anthropic.com/)
- Review [Figma's plugin docs](https://www.figma.com/plugin-docs/)

---

**Remember**: The secret to great UX copy is iteration. Generate multiple times, try different contexts, and pick what feels right for your product!

# AI Assistant Quick Start Guide

## What is the AI Assistant?

The AI Assistant is your intelligent music production helper built directly into the DAW. It understands natural language and can help you create, manage, and organize your music project.

## Location

Find the AI Assistant in the **right sidebar** (top half) of the DAW interface at `/daw`.

## What Can It Do?

### 🎹 Track Management

**Create Tracks:**
- "Create a new MIDI track"
- "Add a drum track"
- "I need a bass track"

**Delete Tracks:**
- "Delete the Bass track"
- "Remove the Drums"

**With Instruments:**
- "Create a drum track with hi-hat"
- "Add a clap track"

### 🔊 Volume Control

- "Make the Drums louder"
- "Set Bass volume to 80%"
- "Increase the synth volume"
- "Make Keys quieter"

### ⏱️ Tempo Control

- "Set BPM to 128"
- "Change tempo to 140"
- "Make it faster, 150 BPM"
- "Slow down to 100 BPM"

### 🎼 Instrument Selection

For MIDI tracks, you can assign sampler instruments:
- "Add hi-hat to the Drums track"
- "Use the clap sound on this track"

**Available instruments:**
- `/audio/clap.wav` - Clap percussion
- `/audio/hihat.wav` - Hi-hat cymbal

### 💡 Creative Help

- "What should I add next?"
- "I'm making an electronic track, help me get started"
- "Give me some ideas for this project"
- "What instruments would work well here?"

## How to Use

1. **Type your request** in the input field at the bottom
2. **Press Send** or hit Enter
3. **Watch the magic happen** - tracks created, settings adjusted automatically
4. **Click suggestions** - AI provides clickable suggestions for next steps

## Example Conversations

### Starting a New Project

**You:** "I'm making an electronic track at 140 BPM, help me get started"

**Assistant:** Sets BPM to 140, suggests creating drum, bass, and synth tracks

---

### Building Your Track

**You:** "Create a drum track with hi-hat"

**Assistant:** Creates MIDI track named "Drums" with hi-hat instrument

**You:** "Add a bass track"

**Assistant:** Creates MIDI track for bass

**You:** "Make the drums louder"

**Assistant:** Increases drum track volume

---

### Getting Ideas

**You:** "What should I add next?"

**Assistant:** Analyzes your current tracks and suggests:
- "Add a pad synth for atmosphere"
- "Create a lead melody track"
- "Try adding percussion for texture"

## Tips for Best Results

### ✅ Do:
- Be conversational and natural
- Mention specific track names when adjusting
- Ask for help when you're stuck
- Use the clickable suggestions
- Combine actions: "Create drum track and set BPM to 128"

### ❌ Don't:
- Don't worry about exact syntax
- Don't need to use technical terms
- Don't hesitate to ask follow-up questions

## Understanding the Response

Each AI response includes:

1. **Message** - Natural language explanation of what it did
2. **Actions** - Automatic changes to your project
3. **Suggestions** - Clickable ideas for next steps

## Features

### Smart Suggestions
After each response, the AI provides 2-3 suggestions displayed as clickable buttons. Click any suggestion to quickly send that request.

### Context Awareness
The AI knows:
- Your current tracks (names, types, volumes)
- Current BPM
- Project state

### Multiple Actions
Request multiple things at once:
- "Create a drum track, bass track, and set BPM to 128"
- "Delete the synth and create a new one"

## Common Use Cases

### 🚀 Starting Fresh
Just ask: "Help me start a new track" or "What should I create first?"

### 🎛️ Mixing
- "Balance the volumes in my mix"
- "Make the drums stand out more"

### 🏗️ Building Arrangement
- "I have drums and bass, what next?"
- "This feels empty, what should I add?"

### 🎨 Creative Block
- "Give me some ideas"
- "What would sound good with what I have?"

### ⚡ Quick Edits
- "Make everything quieter except drums"
- "Speed up the tempo"

## Keyboard Shortcuts

- **Enter** - Send message
- **Tab** - Navigate between input and send button

## Limitations

Current version:
- Creates tracks without pre-populated MIDI/audio clips (you add content manually)
- Limited instrument library (clap, hihat)
- Can't edit MIDI notes directly (use Piano Roll)
- Can't add effects or plugins yet
- Volume control sets absolute values (not relative)

## Troubleshooting

### Assistant not responding?
- Check your internet connection
- Verify `GOOGLE_API_KEY` in `.env.local`
- Check browser console for errors

### Actions not working?
- Make sure track names match
- Check console logs for execution details
- Verify track exists before deletion

### Suggestions not clickable?
- Refresh the page
- Check for JavaScript errors

## Privacy & API Usage

- Messages are sent to Google Gemini API
- No data stored permanently
- Conversation resets on page refresh
- Uses your Google API key from environment variables

## Getting Help

The assistant is here to help! If you're unsure:
- Ask: "What can you do?"
- Ask: "How do I [specific task]?"
- Ask: "What are my options?"

## Next Steps

Once you're comfortable:
1. Use it to quickly prototype ideas
2. Let it handle tedious track management
3. Get creative inspiration when stuck
4. Learn production tips from its suggestions

---

**Remember:** The AI Assistant is a tool to enhance your creativity, not replace it. Use it to speed up workflow and explore new ideas!


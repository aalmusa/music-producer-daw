# AI Assistant Testing Guide

## Prerequisites

1. **Environment Setup**
   - Ensure you have a `.env.local` file in `my-app/` directory
   - Add your Google API key: `GOOGLE_API_KEY=your_key_here`

2. **Install Dependencies**
   ```bash
   cd my-app
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Navigate to DAW**
   - Open browser to `http://localhost:3000/daw`

## Test Cases

### 1. Basic Conversation

**Test**: Assistant responds to greetings and questions

**Steps:**
1. Type "Hello" in the AI Assistant input
2. Press Send or Enter

**Expected Result:**
- Assistant responds with a friendly message
- Provides suggestions for next steps

---

### 2. Create MIDI Track

**Test**: AI creates a new MIDI track

**Steps:**
1. Type "Create a new MIDI track"
2. Send message

**Expected Result:**
- Assistant confirms track creation
- New track appears in track list (left sidebar)
- Track is named something like "Synth 4" or similar
- Console logs show track creation

**Variations to Test:**
- "Add a synth track"
- "I need a MIDI track for bass"
- "Create a melody track"

---

### 3. Create Audio Track

**Test**: AI creates a new audio track

**Steps:**
1. Type "Create an audio track"
2. Send message

**Expected Result:**
- Assistant confirms track creation
- New audio track appears in track list
- Track is named something like "Audio 4"

**Variations to Test:**
- "Add an audio track"
- "I need a track for vocals"

---

### 4. Create Track with Instrument

**Test**: AI creates MIDI track and assigns sampler instrument

**Steps:**
1. Type "Add a drum track with hi-hat"
2. Send message

**Expected Result:**
- New MIDI track created
- Track named "Drums" or similar
- Hi-hat instrument assigned (`/audio/hihat.wav`)
- Console shows instrument selection

**Variations to Test:**
- "Create a clap track"
- "Add drums with the clap sound"

---

### 5. Delete Track

**Test**: AI deletes an existing track

**Steps:**
1. Ensure you have a track named "Bass" or "Drums"
2. Type "Delete the Bass track"
3. Send message

**Expected Result:**
- Assistant confirms deletion
- Track disappears from track list
- Audio engine resources cleaned up

**Variations to Test:**
- "Remove the Drums track"
- "Delete the Keys track"

---

### 6. Adjust Volume

**Test**: AI adjusts track volume

**Steps:**
1. Type "Make the Drums track louder"
2. Send message

**Expected Result:**
- Assistant confirms volume adjustment
- Volume state updated in track data
- Console shows volume change

**Variations to Test:**
- "Set Bass volume to 50%"
- "Make Keys quieter"
- "Increase the volume of the synth"

---

### 7. Adjust BPM

**Test**: AI changes project tempo

**Steps:**
1. Type "Set BPM to 128"
2. Send message

**Expected Result:**
- Assistant confirms BPM change
- Transport bar BPM display updates to 128
- Audio engine BPM updated
- All audio clips adjust playback rate

**Variations to Test:**
- "Change tempo to 140"
- "Make it faster, 150 BPM"
- "Slow down to 100 BPM"

---

### 8. Multiple Actions

**Test**: AI performs multiple actions in one response

**Steps:**
1. Type "Create a drum track with clap and set BPM to 128"
2. Send message

**Expected Result:**
- New MIDI track created with clap instrument
- BPM set to 128
- Assistant explains both actions
- Both changes reflected in UI

---

### 9. Creative Suggestions

**Test**: AI provides ideas for next steps

**Steps:**
1. Type "What should I add next?"
2. Send message

**Expected Result:**
- Assistant analyzes current project state
- Provides 2-3 specific suggestions
- Suggestions appear as clickable buttons
- Clicking suggestion fills input field

---

### 10. Complex Request

**Test**: AI understands context and provides appropriate response

**Steps:**
1. Type "I'm making an electronic track at 140 BPM, help me get started"
2. Send message

**Expected Result:**
- Assistant sets BPM to 140
- Suggests appropriate instruments (drums, bass, synth)
- Provides genre-specific advice
- May create initial tracks

---

### 11. Suggestion Click

**Test**: Clicking suggestions works correctly

**Steps:**
1. Send any message that generates suggestions
2. Click on one of the suggestion buttons

**Expected Result:**
- Suggestion text appears in input field
- Input field is focused
- User can edit or send immediately

---

### 12. Error Handling

**Test**: AI handles invalid requests gracefully

**Steps:**
1. Type "Delete a track that doesn't exist"
2. Send message

**Expected Result:**
- Assistant responds appropriately
- No errors in console
- UI remains functional

---

### 13. Volume Percentage Conversion

**Test**: AI understands volume as percentage

**Steps:**
1. Type "Set Drums volume to 80%"
2. Send message

**Expected Result:**
- Volume set to 0.8 (80%)
- Assistant confirms with percentage or level
- Track volume updated

---

### 14. Track Name Matching

**Test**: AI finds tracks by name even with slight variations

**Steps:**
1. Have a track named "Bass"
2. Type "Make the bass louder"
3. Send message

**Expected Result:**
- AI finds track (case-insensitive)
- Volume increased
- Assistant confirms action on "Bass" track

---

### 15. State Awareness

**Test**: AI is aware of current DAW state

**Steps:**
1. Create several tracks
2. Type "What tracks do I have?"
3. Send message

**Expected Result:**
- Assistant lists current tracks
- Includes track types (MIDI/audio)
- Mentions current BPM
- Provides relevant suggestions

---

## Visual Checks

### UI Components

- [ ] AI Assistant panel visible in right sidebar (top half)
- [ ] Header with sparkles icon and title
- [ ] Messages display correctly (user right, assistant left)
- [ ] Suggestions show as clickable buttons with lightbulb icon
- [ ] Loading indicator (three dots) shows while processing
- [ ] Input field and send button at bottom
- [ ] Auto-scroll works when new messages arrive
- [ ] Send button disabled when input is empty or processing

### Styling

- [ ] Messages have proper colors (emerald for user, slate for assistant)
- [ ] Rounded corners on message bubbles
- [ ] Proper spacing between messages
- [ ] Suggestions have hover effects
- [ ] Border between AI Assistant and lower panel

---

## Console Checks

While testing, monitor the browser console for:

- `🎵 DAW Assistant analyzing request...` - Request sent to API
- `🎹 DAW Assistant Decision:` - Shows parsed response
- `✓ Created midi/audio track:` - Track creation confirmation
- `✓ Deleted track:` - Track deletion confirmation
- `✓ Adjusted volume for X:` - Volume change confirmation
- `✓ Set BPM to X` - BPM change confirmation
- `✓ Set instrument for X:` - Instrument assignment confirmation

Any errors should be clearly logged with `❌` prefix.

---

## Performance Checks

- [ ] Assistant responds within 2-5 seconds
- [ ] No lag when typing in input field
- [ ] Actions execute immediately after response
- [ ] No memory leaks (check DevTools memory tab)
- [ ] Smooth scrolling in message area

---

## Edge Cases

### Empty Project
- Ask for suggestions with no tracks
- Expected: Generic suggestions for getting started

### Full Project
- Create many tracks (10+)
- Ask for suggestions
- Expected: Specific suggestions based on arrangement

### Rapid Requests
- Send multiple messages quickly
- Expected: Messages queued properly, no race conditions

### Long Messages
- Type a very long message (500+ characters)
- Expected: Message displays correctly, doesn't break UI

### Special Characters
- Use quotes, emoji, special characters in messages
- Expected: Handled correctly by API and display

---

## API Error Scenarios

### Missing API Key
1. Remove `GOOGLE_API_KEY` from `.env.local`
2. Restart server
3. Send a message
4. Expected: Error message displayed, assistant stays functional

### Network Error
1. Disconnect internet
2. Send a message
3. Expected: Timeout error, helpful message to user

### Invalid Response
1. (Requires API modification to test)
2. Expected: Fallback to conversational mode

---

## Regression Tests

After any changes, verify:
- [ ] Track creation still works manually
- [ ] Volume sliders still work
- [ ] BPM input in transport bar works
- [ ] Delete track button still works
- [ ] Timeline rendering not affected
- [ ] Mixer displays correctly
- [ ] Audio playback still works
- [ ] MIDI editing still works

---

## Accessibility

- [ ] Tab navigation works through input and send button
- [ ] Enter key sends message
- [ ] Screen reader announces new messages (if implemented)
- [ ] Focus visible on interactive elements
- [ ] Color contrast meets WCAG standards

---

## Mobile Responsiveness

(If applicable)
- [ ] Assistant panel adapts to smaller screens
- [ ] Messages wrap correctly
- [ ] Input field usable on mobile
- [ ] Suggestions tap-friendly

---

## Known Limitations

1. **Track Name Matching**: Requires exact or close match
2. **Instrument Library**: Limited to clap and hihat samples
3. **Volume Control**: Only sets absolute values, no relative adjustments yet
4. **Multiple Track Actions**: Can't perform same action on multiple tracks at once
5. **Undo/Redo**: No action history or undo functionality yet

---

## Troubleshooting

### Assistant Not Responding
- Check console for errors
- Verify API key in `.env.local`
- Check network tab for 401/500 errors
- Restart dev server

### Actions Not Executing
- Check console for action logs
- Verify track names match exactly
- Check that action type is valid
- Verify track exists before deletion

### UI Not Updating
- Check React DevTools for state changes
- Verify callback is being called
- Check for JavaScript errors
- Force refresh page

### Slow Responses
- Check network tab for API timing
- Verify Gemini API status
- Check for rate limiting
- Monitor token usage in API logs

---

## Success Criteria

The AI Assistant is working correctly if:

✅ All basic test cases pass
✅ Actions execute and update UI correctly
✅ Suggestions are relevant and clickable
✅ Error messages are helpful
✅ No console errors during normal operation
✅ Performance is acceptable (< 5s response time)
✅ State stays synchronized between assistant and DAW
✅ UI is responsive and intuitive

---

## Reporting Issues

When reporting bugs, include:
1. Exact steps to reproduce
2. Expected vs actual behavior
3. Console logs and errors
4. Screenshots if applicable
5. Browser and OS version
6. Current DAW state (number of tracks, BPM, etc.)

---

## Next Steps After Testing

Based on test results:
1. Fix any critical bugs
2. Improve suggestion quality
3. Enhance error messages
4. Add more instrument options
5. Implement action history
6. Add more natural language patterns
7. Improve context awareness


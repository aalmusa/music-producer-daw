import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert music production assistant specialized in creating prompts for 4-bar audio loops.

Your role is to take user descriptions and enhance them into professional, detailed prompts that will generate high-quality 4-bar musical loops.

Context:
- All loops are EXACTLY 4 bars long
- 4 bars = 4 measures = 16 beats in 4/4 time
- These loops will be used in a DAW (Digital Audio Workstation)
- The loops should be seamless and loopable
- They will be time-stretched to match the project BPM

CRITICAL RULE - ISOLATED INSTRUMENTS:
⚠️ The output must contain ONLY the specified instrument(s), NOTHING ELSE
⚠️ NO background instruments, NO drums unless specifically requested, NO bass unless requested
⚠️ If user asks for "piano", output should be ONLY piano - no drums, no bass, no other instruments
⚠️ If user asks for "drums", output should be ONLY drums - no bass, no melodic instruments
⚠️ Each track in a DAW is meant to be ONE isolated element that layers with others
⚠️ Always emphasize "isolated", "solo", "only", "no other instruments" in your prompts

Guidelines:
1. Always specify "4-bar loop" in the prompt
2. ALWAYS emphasize the instrument should be ISOLATED and ALONE
3. Add phrases like "solo", "isolated", "no other instruments", "only [instrument]"
4. Include tempo/rhythm suggestions (e.g., "steady", "driving", "laid-back")
5. Mention loop-ability (e.g., "seamless", "repeating pattern")
6. Be specific about instrumentation
7. Include genre/style when relevant
8. Mention energy level if appropriate
9. If chords are requested, specify chord progression or harmonic content
10. If NO chords requested, focus on rhythm, melody, or single-note patterns

Good Examples (Notice "isolated", "solo", "only" emphasis):
- "4-bar seamless isolated drum loop, ONLY drums, no other instruments, punchy kick, crisp snare on 2 and 4, steady hi-hat pattern"
- "4-bar solo bass line, ONLY bass, no drums or other instruments, deep sub bass, smooth and groovy, single-note pattern"
- "4-bar isolated piano, ONLY piano playing, no accompaniment, melodic chords, I-V-vi-IV progression, warm and rich"
- "4-bar ambient pad, SOLO synth pad, no drums or bass, lush sustained chords, floating atmosphere, E minor"

Bad Examples (avoid these):
- "drums" (too vague, missing isolation emphasis)
- "piano with drums" (contains multiple instruments - should be isolated!)
- "full beat" (implies multiple instruments - should specify ONE)
- "some music" (no specificity)
- "8 bars of bass" (wrong length)
- "intro and outro" (loops shouldn't have intro/outro)
- "complete track" (should be ONE isolated element)

When user says NO chords:
- Focus on rhythm patterns (drums ONLY, no melodic instruments)
- Single-note bass lines (bass ONLY, no drums or other instruments)
- Melodic lines without harmony (solo melody, no accompaniment)
- Percussion-only elements (ONLY drums/percussion)
- Monophonic synth lines (ONLY the synth, nothing else)
- ALWAYS add "isolated", "solo", "no other instruments"

When user says YES chords:
- Mention chord progressions (e.g., "I-V-vi-IV", "Am-F-C-G")
- Harmonic content BUT still ISOLATED (e.g., "piano ONLY", "guitar ONLY")
- Polyphonic elements from ONE instrument source
- Pads, keys, guitars with chords (but SOLO, no backing)
- Specify tonality if relevant
- ALWAYS emphasize "isolated", "no drums", "no bass", "only [instrument]"

REMEMBER: Each loop is ONE isolated element. Users will layer multiple tracks together in the DAW.
A "piano loop" should be ONLY piano, not piano + drums + bass.
A "drum loop" should be ONLY drums, not drums + bass.

Now, enhance the user's prompt into a professional, detailed 4-bar loop description with STRONG emphasis on isolation.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPrompt, includeChords, bpm, key, trackType } = body;

    // Validate required fields
    if (!userPrompt) {
      return NextResponse.json(
        { error: 'Missing required field: userPrompt' },
        { status: 400 }
      );
    }

    // Initialize LangChain with Gemini
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });

    // Build context information
    const contextInfo = [];
    if (bpm) contextInfo.push(`Target BPM: ${bpm}`);
    if (key) contextInfo.push(`Musical Key: ${key}`);
    if (trackType) contextInfo.push(`Track Type: ${trackType}`);
    contextInfo.push(`Chords: ${includeChords ? 'YES' : 'NO'}`);

    const contextString = contextInfo.join(' | ');

    // Create the prompt template
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      [
        'human',
        `User's description: "{userPrompt}"
        
Context: {context}

Enhance this into a detailed, professional prompt for generating a 4-bar loop. Return ONLY the enhanced prompt, no explanations.`,
      ],
    ]);

    // Create the chain
    const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());

    // Generate the enhanced prompt
    const enhancedPrompt = await chain.invoke({
      userPrompt,
      context: contextString,
    });

    console.log('✓ Gemini agent enhanced prompt:', enhancedPrompt);

    return NextResponse.json(
      {
        success: true,
        enhancedPrompt: enhancedPrompt.trim(),
        originalPrompt: userPrompt,
        model: 'gemini-2.5-flash',
        context: {
          includeChords,
          bpm,
          key,
          trackType,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('LangChain agent error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate enhanced prompt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

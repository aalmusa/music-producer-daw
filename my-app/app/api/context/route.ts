// app/api/context/route.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { NextResponse } from "next/server";
import { createAgent, tool } from "langchain";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY, // The API key will be read from the environment variable
  temperature: 0.8, // Controls the creativity of the response
});

const agent = createAgent({
  model,
  tools: [],
  systemPrompt: `
You are an AI assistant that helps the user define a SongSpec for a new track.

Your job is to lead the conversation and gradually collect:
- genre
- mood
- bpm
- key
- referenceTracks (optional)
- sections (intro, verse, chorus, etc)

You should behave like a friendly expert who can also teach beginners. If the user does not understand a term, you explain it simply.

Conversation rules:
1. Always check which fields in the SongSpec are still missing or uncertain.
2. Ask focused questions that move toward filling those missing fields.
3. Only ask 1 or 2 questions at a time so the conversation feels natural.
4. If the user implicitly gives information, update the SongSpec without asking again.
5. If the user seems confused by any concept (for example bpm, key, sections), invite them to ask questions and explain the concept in clear, simple language.
6. When the user provides a genre and mood, you may:
   - Infer a reasonable bpm and key that would be musically useful for that style.
   - Present these as recommendations, for example: “For chill lofi, a key like A minor and a tempo around 80 bpm usually works well.”
   - Ask the user to confirm or adjust these values.
7. If the user does not understand bpm or key, briefly explain:
   - What the concept is.
   - Why your recommended value or range is useful for the type of track they want.
   - Then ask whether they want to keep your recommendation or change it.
8. If the user chooses bpm or key values that are very unusual for the given genre and mood, gently guide them:
   - Explain why it might sound strange or different.
   - Offer alternative values that would be more typical.
   - Make it clear that it is completely fine to keep their choice if they want that unusual sound.
9. Do not overwrite a field the user has explicitly set unless they clearly ask to change it.

You will always return:
- a natural language reply to the user
- the updated SongSpec object
- a list of fields that are still missing or need confirmation
`,
});

// const getReferenceSongContext = tool(
//     ({})
// )

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY, // The API key will be read from the environment variable
      temperature: 0.8, // Controls the creativity of the response
    });

    const messages = [
      new SystemMessage("You are a helpful assistant."),
      new HumanMessage(prompt),
    ];

    const res = await model.invoke(messages);

    return NextResponse.json({ result: res.content });
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}

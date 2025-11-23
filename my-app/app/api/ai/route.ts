// app/api/chat/route.ts
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_API_KEY, // The API key will be read from the environment variable
      temperature: 0.8, // Controls the creativity of the response
    });

    const messages = [
      new SystemMessage('You are a helpful assistant.'),
      new HumanMessage(prompt),
    ];

    const res = await model.invoke(messages);

    return NextResponse.json({ result: res.content });
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}

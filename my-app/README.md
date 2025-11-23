AI Music Studio

"Cursor for Music Production"

AI Music Studio is an intelligent, collaborative music production environment that bridges the gap between creative intent and technical execution. It acts as a co-producer, helping you define your sound through conversation and audio analysis before generating a fully scaffolded project in a web-based DAW.

Powered by Google Gemini, TensorFlow, Essentia.js, ElevenLabs and Tone.js.

Features

1. Conversational Pre-Production (The Agent)

Instead of staring at a blank timeline, start by chatting with an expert AI Producer.

Ideation: Discuss themes, moods, and genres.

Reference Analysis: Upload MP3/WAV reference tracks. The system analyzes them locally using Essentia and TensorFlow to extract:

BPM & Tempo

Key & Scale

Genre & Mood (via MusiCNN)

Energy Segments

SongSpec Generation: The agent builds a structured JSON SongSpec that acts as the blueprint for your track.

2. The Intelligent Studio

Once the SongSpec is "Greenlit" by the agent, you transition to the Studio interface.

Auto-Scaffolding: The DAW automatically sets up tracks, instruments, and effects based on the agreed-upon spec.

AI-Assisted Editing: Type natural language commands to modify the project (e.g., "Change the drums to a Trap kit" or "Make the chords more melancholic").

Generative Audio & MIDI:

Generate MIDI progressions with guidance.

Fetch/Generate Audio Loops (integrated with ElevenLabs).

Technical Advisor: Stuck on a mix? Ask the agent for advice on EQ, compression, or arrangement.

Tech Stack

Core & UI

Next.js 15 - React Framework (App Router).

ShadCN UI - Beautiful, accessible UI components.

Tailwind CSS - Styling.

Lucide React - Icons.

AI & Logic

LangChain - Agent orchestration, tool calling, and state management.

Google Gemini - The LLM brain driving the conversation and decision making.

LangGraph - Manages conversation history and agent state transitions.

ElevenLabs - Generative AI for creating realistic audio loops and samples.

Audio Processing (DSP)

Tone.js - Web Audio framework for playback, synthesis, and scheduling in the browser.

Essentia.js - WASM-based library for extracting audio features (BPM, Key, Loudness).

TensorFlow.js - Runs the MusiCNN model for genre and mood classification.

Getting Started

Prerequisites

Node.js (v18+)

A Google Generative AI API Key

Installation

Clone the repository

git clone https://github.com/aalmusa/music-producer-daw.git

Install Dependencies
Note: This project uses native binaries (@tensorflow/tfjs-node). Ensure your build tools are ready.

npm install

Configure Environment
Create a .env.local file in the root directory:

# Required for the Agent

GOOGLE_API_KEY=your_gemini_api_key_here

# Optional: For Audio Generation

ELEVENLABS_API_KEY=your_elevenlabs_key_here

Run the Development Server

npm run dev

Open http://localhost:3000 in your browser.

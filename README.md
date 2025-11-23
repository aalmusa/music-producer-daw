# AI Music Studio

**"Cursor for Music Production"**

AI Music Studio is an intelligent, collaborative music production environment that bridges the gap between creative intent and technical execution. It acts as a digital co-producer, helping you define your sound through conversation, reference-track analysis, and guided decision making. When ready, it generates a fully scaffolded project in a web-based DAW.

Powered by Google Gemini, TensorFlow, Essentia.js, ElevenLabs, and Tone.js.

---

## Features

### 1. Conversational Pre-Production (The Agent)

Instead of starting from an empty timeline, you begin by chatting with an expert AI producer.

**Ideation**
Discuss themes, moods, genres, narrative ideas, or production goals.

**Reference Track Analysis**
Upload MP3 or WAV reference tracks. The system analyzes them locally using Essentia.js and TensorFlow to extract:

* BPM and Tempo
* Key and Scale
* Genre and Mood (via MusiCNN)
* Timbre and Energy Segments
* Loudness and Dynamic Features

**SongSpec Generation**
The agent converts your creative ideas and extracted audio features into a structured JSON SongSpec that acts as the blueprint for track creation.

---

### 2. The Intelligent Studio

After the SongSpec is approved, you transition into the interactive Studio interface.

**Auto-Scaffolding**
The DAW automatically sets up tracks, instruments, effects, gain staging, metadata, and routing based on the finalized SongSpec.

**AI-Assisted Editing**
Use natural language commands to modify your project, such as:

* “Change the drums to a trap kit.”
* “Make the chords more melancholic.”
* “Reduce energy in the bridge.”

**Generative Audio and MIDI**

* Generate MIDI chord progressions, basslines, or melodies.
* Create or fetch audio loops using ElevenLabs’ generative audio capabilities.

**Technical Advisor**
Ask questions about mixing, EQ, compression, sound design, arrangement, or mastering. The agent provides best-practice guidance as you work.

---

## Tech Stack

### Core and UI

* **Next.js 15**
* **ShadCN UI**
* **Tailwind CSS**
* **Lucide React**

### AI and Logic

* **LangChain** for tool calling and orchestration
* **LangGraph** for managing agent state transitions
* **Google Gemini** for conversational reasoning and production feedback
* **ElevenLabs API** for generative audio loops and samples

### Audio Processing (DSP)

* **Tone.js** for synthesis, scheduling, and Web Audio playback
* **Essentia.js** (WASM) for feature extraction such as BPM, key, and loudness
* **TensorFlow.js** for running the MusiCNN model in-process

---

## Getting Started

### Prerequisites

* Node.js v18 or newer
* A Google Generative AI API key
* (Optional) An ElevenLabs API key for generative audio features

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/aalmusa/music-producer-daw.git
```

### 2. Install Dependencies

Note: This project uses native binaries such as `@tensorflow/tfjs-node`. Ensure system build tools are installed.

```bash
npm install
```

---

## Configuration

Create an `.env.local` file in the project root:

```
# Required for the Agent
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional: For Generative Audio
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

---

## Running the App

Start the development server:

```bash
npm run dev
```

Then open:

```
http://localhost:3000
```


## User Interface

<img width="400" height="280" alt="image" src="https://github.com/user-attachments/assets/5939b74a-ecc3-4cda-ba30-e24f7d376f4e" />
<br>

<img width="400" height="280" alt="image" src="https://github.com/user-attachments/assets/0b083524-cd48-493f-8061-72e511c472ba" />



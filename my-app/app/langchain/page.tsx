// app/page.tsx
'use client';
import { useState } from 'react';

export default function LangchainPage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setResponse(data.result);
    setIsLoading(false);
  };

  return (
    <div>
      <h1>LangChain Next.js App</h1>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Enter your prompt'
        />
        <button type='submit' disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Generate Response'}
        </button>
      </form>
      {response && (
        <div>
          <h2>Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

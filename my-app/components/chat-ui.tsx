"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

type message = {
    id: string;
    role: "user" | "Ai";
    content: string;
};

const SUGGESTIONS = [
    "Create me a sample beat at 120 bpm with a 4/4 time signature",
    "Create a melowy synthwave track with a 1/16 time signature",
    "Create a brazillian phonk beat",
    "Create a hardstyle track with a 1/4 time signature",
];

export function ChatUI() {
    const [messages, setMessages] = useState<message[]>([]);
    const [input, setInput] = useState("");

    function addMessage(content: string, role: "user" | "Ai") {
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role, content },
        ]);
    }

    function handleSend(e?: React.FormEvent) {
        e?.preventDefault();
        const text = input.trim();
        if (!text) return;

        addMessage(text, "user");
        setInput("");

        setTimeout(() => {
            addMessage("This is a placeholder assistant response.", "Ai");
        }, 400);
    }

    function handleSuggestionClick(text: string) {
        // either send immediately or just fill the input – here we send
        setInput(text);
        setTimeout(() => {
          handleSend();
        }, 0);
    }

    return (
        <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
          {/* Main scrollable area - scrollbar on right edge */}
          <main className="flex-1 overflow-y-auto">
            <div className="flex justify-center px-4 py-6">
              <div className="flex w-full max-w-4xl flex-col gap-4">
                {/* Header */}
                <header className="mb-2">
                  <h1 className="text-3xl font-semibold">Hello there!</h1>
                  <p className="text-muted-foreground">
                    How can I help you today?
                  </p>
                </header>
      
                {/* Suggested prompts (only when there are no messages) */}
                {messages.length === 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestionClick(s)}
                        className="rounded-full border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
      
                {/* Messages area */}
                {messages.length > 0 && (
                  <div className="flex flex-col gap-4 pb-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${
                          m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            m.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
    
          <Separator />
    
          {/* Bottom input bar - fixed */}
          <footer className="w-full px-4 py-3 flex-shrink-0">
            <form
              onSubmit={handleSend}
              className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border border-border bg-card px-3 py-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!input.trim()}
              >
                ➤
              </Button>
            </form>
          </footer>
        </div>
      );

}
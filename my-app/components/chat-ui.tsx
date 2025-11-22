"use client";

import { useState, useRef } from "react";
import { Music, Paperclip, X, File } from "lucide-react";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./ui/input-group";
import { Separator } from "./ui/separator";
import Threads from "./Threads";


type message = {
    id: string;
    role: "user" | "Ai";
    content: string;
    attachedFiles?: AttachedFile[];
};

type AttachedFile = {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
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
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function addMessage(content: string, role: "user" | "Ai", files?: AttachedFile[]) {
        setMessages((prev) => [
            ...prev,
            { 
                id: crypto.randomUUID(), 
                role, 
                content,
                attachedFiles: files && files.length > 0 ? files : undefined,
            },
        ]);
    }

    function handleSend(e?: React.FormEvent) {
        e?.preventDefault();
        const text = input.trim();
        if (!text && attachedFiles.length === 0) return;

        // Send message with text and/or files
        const messageContent = text || `Sent ${attachedFiles.length} file(s)`;
        const filesToSend = [...attachedFiles]; // Copy files before clearing
        addMessage(messageContent, "user", filesToSend);
        setInput("");
        setAttachedFiles([]); // Clear attached files after sending

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

    function handleAttachFile() {
        fileInputRef.current?.click();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            const newFiles: AttachedFile[] = fileArray.map((file) => ({
                id: crypto.randomUUID(),
                file,
                name: file.name,
                size: file.size,
                type: file.type,
            }));
            
            setAttachedFiles((prev) => [...prev, ...newFiles]);
            
            // Store files (for now in memory, can be extended to save to disk/flat-file)
            // TODO: Implement file storage to disk or flat-file system
            newFiles.forEach((attachedFile) => {
                // Store file data - in a real implementation, you would:
                // 1. Save to disk using Node.js fs module (server-side)
                // 2. Or use IndexedDB for client-side storage
                // 3. Or upload to a cloud storage service
                console.log("File stored:", attachedFile.name, attachedFile.size, "bytes");
            });
        }
        // Reset the input so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    function handleRemoveFile(fileId: string) {
        setAttachedFiles((prev) => {
            const fileToRemove = prev.find((f) => f.id === fileId);
            if (fileToRemove) {
                // TODO: Remove file from disk/flat-file storage
                console.log("File removed:", fileToRemove.name);
            }
            return prev.filter((f) => f.id !== fileId);
        });
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    }

    return (
        <div className="flex h-full flex-col bg-background text-foreground overflow-hidden relative">
          {/* Background Threads animation */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <Threads
              amplitude={3}
              distance={0}
              enableMouseInteraction={true}
              color={[1, 1, 1]}
            />
          </div>
          {/* Main scrollable area - scrollbar on right edge */}
          <main className="flex-1 overflow-y-auto relative z-10">
            <div className="flex justify-center px-4 py-6">
              <div className="flex w-full max-w-4xl flex-col gap-4">
                {/* Header */}
                <header className="mb-2">
                  <h1 className="text-3xl font-semibold">Hello there!</h1>
                  <p className="text-muted-foreground">
                    How can I help you today?
                  </p>
                </header>
      
                {/* Messages area */}
                {messages.length > 0 && (
                  <div className="flex flex-col gap-4 pb-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col items-end gap-2 ${
                          m.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`flex items-start gap-2 w-full ${
                            m.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {m.role === "Ai" && (
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted border border-border mt-0.5">
                              <Music className="h-4 w-4 text-foreground" />
                            </div>
                          )}
                          <div className={`flex flex-col gap-2 max-w-[80%] ${
                            m.role === "user" ? "items-end" : "items-start"
                          }`}>
                            {/* Show attached files above message for user messages */}
                            {m.role === "user" && m.attachedFiles && m.attachedFiles.length > 0 && (
                              <div className="flex flex-wrap gap-2 justify-end">
                                {m.attachedFiles.map((attachedFile) => (
                                  <div
                                    key={attachedFile.id}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                                  >
                                    <File className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-foreground">
                                        {attachedFile.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatFileSize(attachedFile.size)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm w-fit ${
                                m.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
    
          <Separator className="relative z-10" />
    
          {/* Bottom input bar - fixed */}
          <footer className="w-full px-4 py-3 flex-shrink-0 relative z-10">
            {/* Suggested prompts - above input bar */}
            {messages.length === 0 && (
              <div className="mx-auto mb-3 w-full max-w-4xl">
                <div className="grid gap-3 md:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="rounded-full border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:border-primary hover:shadow-md hover:scale-[1.02]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Attached files display */}
            {attachedFiles.length > 0 && (
              <div className="mx-auto mb-2 w-full max-w-4xl">
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((attachedFile) => (
                    <div
                      key={attachedFile.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <File className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {attachedFile.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachedFile.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(attachedFile.id)}
                        className="ml-1 rounded-full p-1 hover:bg-muted transition-colors"
                        aria-label={`Remove ${attachedFile.name}`}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <form
              onSubmit={handleSend}
              className="mx-auto flex w-full max-w-4xl items-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                aria-label="Attach file"
              />
              <ButtonGroup className="[--radius:9999rem] w-full">
                <ButtonGroup>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAttachFile}
                    aria-label="Attach file"
                    className="transition-all duration-200 hover:bg-accent hover:border-primary hover:shadow-md hover:scale-105"
                  >
                    <Paperclip />
                  </Button>
                </ButtonGroup>
                <ButtonGroup className="flex-1">
                  <InputGroup className="rounded-full border border-border bg-card">
                    <InputGroupInput
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Send a message..."
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="submit"
                        size="icon-xs"
                        disabled={!input.trim() && attachedFiles.length === 0}
                        className="rounded-full transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-110 disabled:hover:scale-100 disabled:hover:shadow-none"
                      >
                        ➤
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </ButtonGroup>
              </ButtonGroup>
            </form>
          </footer>
        </div>
      );

}
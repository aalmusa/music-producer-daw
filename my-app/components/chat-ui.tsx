'use client';

import { useSongSpec } from '@/lib/song-spec-context';
import { File, Music, Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from './ui/input-group';
import { Separator } from './ui/separator';

type Message = {
  id: string;
  role: 'user' | 'Ai';
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
  'Help me create a chill lo-fi hip hop track',
  'Help me create an energetic electronic dance track',
  'Help me create a smooth jazz track',
  'Help me create a high-energy rock track',
];

export function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateSongSpec } = useSongSpec();

  function addMessage(
    content: string,
    role: 'user' | 'Ai',
    files?: AttachedFile[]
  ) {
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

  // Core send handler, now talks to your backend
  async function handleSend(
    e?: React.FormEvent,
    overrideText?: string
  ): Promise<void> {
    e?.preventDefault();
    if (isSending) return;

    const text = (overrideText ?? input).trim();
    if (!text && attachedFiles.length === 0) return;

    const filesToSend = [...attachedFiles]; // copy before clearing

    // Add the user message to the UI immediately
    const messageContent = text || `Sent ${filesToSend.length} file(s)`;
    addMessage(messageContent, 'user', filesToSend);

    // Clear input and attached files in the UI
    setInput('');
    setAttachedFiles([]);

    try {
      setIsSending(true);

      let filePaths: string[] = [];

      // 1) Upload files if any
      if (filesToSend.length > 0) {
        const formData = new FormData();
        for (const f of filesToSend) {
          formData.append('files', f.file);
        }

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error('Upload failed');
          addMessage(
            'I had trouble uploading your reference files. Please try again.',
            'Ai'
          );
          setIsSending(false);
          return;
        }

        const uploadData = await uploadRes.json();
        filePaths = uploadData.filePaths ?? [];
      }

      // 2) Call context endpoint with prompt + reference file paths
      const contextBody: any = {
        prompt: text,
        songId: 'default',
      };
      if (filePaths.length > 0) {
        contextBody.referenceFilePaths = filePaths;
      }

      const ctxRes = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextBody),
      });

      if (!ctxRes.ok) {
        console.error('Context call failed');
        addMessage(
          'Something went wrong while analyzing your track context. Please try again.',
          'Ai'
        );
        setIsSending(false);
        return;
      }

      const ctxData = await ctxRes.json();
      const assistantReply =
        ctxData.reply ??
        'I received your request and references, but I could not generate a detailed response.';

      // Show assistant reply
      addMessage(assistantReply, 'Ai');

      // Update the song spec in context if provided
      if (ctxData.songSpec) {
        updateSongSpec(ctxData.songSpec);
      }
    } catch (err) {
      console.error('Send error:', err);
      addMessage(
        'There was a network error while talking to the backend.',
        'Ai'
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSuggestionClick(text: string) {
    // send the suggestion as the prompt
    await handleSend(undefined, text);
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

      newFiles.forEach((attachedFile) => {
        console.log(
          'File ready to upload:',
          attachedFile.name,
          attachedFile.size,
          'bytes'
        );
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleRemoveFile(fileId: string) {
    setAttachedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove) {
        console.log('File removed (will not be uploaded):', fileToRemove.name);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  return (
    <div className='flex h-full flex-col bg-background text-foreground overflow-hidden relative'>
      {/* Main scrollable area */}
      <main className='flex-1 overflow-y-auto relative z-10'>
        <div className='flex justify-center px-4 py-6'>
          <div className='flex w-full max-w-4xl flex-col gap-4'>
            {/* Header */}
            <header className='mb-2'>
              <h1 className='text-3xl font-semibold'>Hello there!</h1>
              <p className='text-muted-foreground'>How can I help you today?</p>
            </header>

            {/* Messages area */}
            {messages.length > 0 && (
              <div className='flex flex-col gap-4 pb-4'>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-2 ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 w-full ${
                        m.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {m.role === 'Ai' && (
                        <div className='flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted border border-border mt-0.5'>
                          <Music className='h-4 w-4 text-foreground' />
                        </div>
                      )}
                      <div
                        className={`flex flex-col gap-2 max-w-[80%] ${
                          m.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        {/* Attached files for user messages */}
                        {m.role === 'user' &&
                          m.attachedFiles &&
                          m.attachedFiles.length > 0 && (
                            <div className='flex flex-wrap gap-2 justify-end'>
                              {m.attachedFiles.map((attachedFile) => (
                                <div
                                  key={attachedFile.id}
                                  className='flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm'
                                >
                                  <File className='h-4 w-4 text-muted-foreground' />
                                  <div className='flex flex-col'>
                                    <span className='font-medium text-foreground'>
                                      {attachedFile.name}
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
                                      {formatFileSize(attachedFile.size)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm w-fit ${
                            m.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className='text-xs text-muted-foreground'>
                    Analyzing your references and generating a response...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Separator className='relative z-10' />

      {/* Bottom input bar */}
      <footer className='w-full px-4 py-3 flex-shrink-0 relative z-10'>
        {/* Suggested prompts */}
        {messages.length === 0 && (
          <div className='mx-auto mb-3 w-full max-w-4xl'>
            <div className='grid gap-3 md:grid-cols-2'>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type='button'
                  onClick={() => handleSuggestionClick(s)}
                  className='cursor-pointer rounded-full border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:border-primary hover:shadow-md hover:scale-[1.02]'
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attached files display (current unsent ones) */}
        {attachedFiles.length > 0 && (
          <div className='mx-auto mb-2 w-full max-w-4xl'>
            <div className='flex flex-wrap gap-2'>
              {attachedFiles.map((attachedFile) => (
                <div
                  key={attachedFile.id}
                  className='flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm'
                >
                  <File className='h-4 w-4 text-muted-foreground' />
                  <div className='flex flex-col'>
                    <span className='font-medium text-foreground'>
                      {attachedFile.name}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {formatFileSize(attachedFile.size)}
                    </span>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleRemoveFile(attachedFile.id)}
                    className='ml-1 rounded-full p-1 hover:bg-muted transition-colors'
                    aria-label={`Remove ${attachedFile.name}`}
                  >
                    <X className='h-3.5 w-3.5 text-muted-foreground' />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            void handleSend(e);
          }}
          className='mx-auto flex w-full max-w-4xl items-center'
        >
          <input
            ref={fileInputRef}
            type='file'
            multiple
            className='hidden'
            onChange={handleFileChange}
            aria-label='Attach file'
          />
          <ButtonGroup className='[--radius:9999rem] w-full'>
            <ButtonGroup>
              <Button
                type='button'
                variant='outline'
                onClick={handleAttachFile}
                aria-label='Attach file'
                className='cursor-pointer transition-all duration-200 hover:bg-accent hover:border-primary hover:shadow-md hover:scale-105 flex items-center gap-2'
              >
                <Paperclip className='h-4 w-4' />
                <span className='text-sm'>Upload reference track</span>
              </Button>
            </ButtonGroup>
            <ButtonGroup className='flex-1'>
              <InputGroup className='rounded-full border border-border bg-card'>
                <InputGroupInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Send a message...'
                />
                <InputGroupAddon align='inline-end'>
                  <InputGroupButton
                    type='submit'
                    size='icon-xs'
                    disabled={
                      isSending || (!input.trim() && attachedFiles.length === 0)
                    }
                    className='cursor-pointer rounded-full transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-110 disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed'
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

import { useState, useCallback, useRef } from 'react';
import { streamChat, generateImage } from '../lib/api';
import type { ChatMessage, ToolCallDisplay, ChatMode, AgentEvent } from '../lib/types';

let msgId = 0;
function nextId(): string {
  return `msg-${++msgId}-${Date.now()}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadMessages = useCallback((msgs: ChatMessage[]) => {
    abortRef.current?.abort();
    setMessages(msgs);
    setIsStreaming(false);
  }, []);

  const send = useCallback(
    async (content: string, mode: ChatMode, model?: string, imageModel?: string, systemPrompt?: string) => {
      const userMsg: ChatMessage = { id: nextId(), role: 'user', content };
      const assistantMsgId = nextId();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId, role: 'assistant', content: '', images: [], toolCalls: [], streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (mode === 'image') {
          const results = await generateImage(content, undefined, imageModel);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `"${content}"`, images: results.map((r) => r.url), streaming: false }
                : m,
            ),
          );
        } else {
          const apiMessages = [
            ...messages.filter((m) => m.role !== 'tool' && m.content)
              .map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ];

          let assistantText = '';
          const toolCalls: ToolCallDisplay[] = [];
          let plan: string[] = [];

          await streamChat(
            apiMessages,
            (event: AgentEvent) => {
              if (event.type === 'text') {
                assistantText += event.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: assistantText, plan: plan.length > 0 ? plan : undefined }
                      : m,
                  ),
                );
              } else if (event.type === 'plan') {
                plan = event.steps;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, plan: [...plan] } : m,
                  ),
                );
              } else if (event.type === 'tool_call') {
                const tc: ToolCallDisplay = {
                  id: event.id, tool: event.tool, args: event.args, status: 'running',
                };
                toolCalls.push(tc);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, toolCalls: [...toolCalls] } : m,
                  ),
                );
              } else if (event.type === 'tool_result') {
                const idx = toolCalls.findIndex((t) => t.id === event.id);
                if (idx !== -1) {
                  toolCalls[idx] = { ...toolCalls[idx], result: event.result, status: 'done' };
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, toolCalls: [...toolCalls] } : m,
                  ),
                );
              }
            },
            controller.signal,
            model,
            systemPrompt,
          );
        }
      } catch (err) {
        const errMsg =
          (err as Error).name === 'AbortError' ? '[Stopped]' : `[Error: ${(err as Error).message}]`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content ? m.content + '\n\n' + errMsg : errMsg, streaming: false }
              : m,
          ),
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && m.streaming
              ? { ...m, content: m.content || '...', streaming: false }
              : m,
          ),
        );
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages],
  );

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, send, stop, clear, loadMessages };
}

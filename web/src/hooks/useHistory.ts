import { useState, useEffect } from 'react';
import type { Conversation, ChatMessage } from '../lib/types';

const STORAGE_KEY = 'agent_conversations';

function loadConvs(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useHistory() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConvs);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 50)));
  }, [conversations]);

  const addConversation = (title: string): string => {
    const id = `conv-${Date.now()}`;
    const conv: Conversation = { id, title, messages: [], createdAt: Date.now() };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    return id;
  };

  const updateConversation = (id: string, messages: ChatMessage[]) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, messages } : c)),
    );
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId('');
  };

  const clearAll = () => {
    setConversations([]);
    setActiveId('');
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    conversations,
    activeId,
    setActiveId,
    addConversation,
    updateConversation,
    deleteConversation,
    clearAll,
  };
}

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './components/MessageBubble';
import ModelSelector from './components/ModelSelector';
import RoleSelector from './components/RoleSelector';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import LoadingScreen from './components/LoadingScreen';
import { useChat } from './hooks/useChat';
import { useHistory } from './hooks/useHistory';
import { checkHealth } from './lib/api';
import type { ChatMode } from './lib/types';

export default function App() {
  const { messages, isStreaming, send, stop, clear, loadMessages } = useChat();
  const { conversations, activeId, setActiveId, addConversation, updateConversation, deleteConversation } = useHistory();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('chat');
  const [model, setModel] = useState(() => localStorage.getItem('agent_model') ?? 'agnes-3.0-flash');
  const [imageModel, setImageModel] = useState(() => localStorage.getItem('agent_image_model') ?? 'agnes-image-2.5-flash');
  const [role, setRole] = useState(() => localStorage.getItem('agent_role') ?? '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('agent_theme') !== 'light');
  const [health, setHealth] = useState<{ status: string; model: string; hasApiKey: boolean } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { checkHealth().then(setHealth); }, []);
  useEffect(() => { if (model) localStorage.setItem('agent_model', model); }, [model]);
  useEffect(() => { if (imageModel) localStorage.setItem('agent_image_model', imageModel); }, [imageModel]);
  useEffect(() => { localStorage.setItem('agent_role', role); }, [role]);

  useEffect(() => {
    if (activeId && messages.length > 0) {
      updateConversation(activeId, messages);
    }
  }, [messages, activeId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    if (!activeId || messages.length === 0) {
      addConversation(text.slice(0, 40));
    }
    send(text, mode, model, imageModel, role);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleNewChat = () => {
    clear();
    setActiveId('');
    setMode('chat');
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSelectConv = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) { loadMessages(conv.messages || []); setActiveId(id); }
    else { clear(); setActiveId(''); }
  };

  const hasMessages = messages.length > 0;

  if (loading) {
    return (
      <div className={'app-bg flex h-screen text-slate-200' + (hasMessages ? ' in-conversation' : '') + (darkMode ? '' : ' light-mode')}>
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className={'app-bg flex h-screen text-slate-200' + (hasMessages ? ' in-conversation' : '')}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConv}
        onDelete={(id) => deleteConversation(id)}
      />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={'hamburger ' + (sidebarOpen ? 'open' : '')}
            >
              <svg viewBox="0 0 32 32">
                <path className="line" d="M4 10h24" />
                <path className="line line-top-bottom" d="M4 16h24" />
                <path className="line" d="M4 22h24" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-300">
              {conversations.find((c) => c.id === activeId)?.title ?? 'New Chat'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {health && !health.hasApiKey && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-400">No API Key</span>
            )}
            <RoleSelector value={role} onChange={setRole} />
            <ModelSelector
              selected={mode === 'image' ? imageModel : model}
              onSelect={(m) => { if (mode === 'image') setImageModel(m); else setModel(m); }}
              imageSelected={imageModel}
              onImageSelect={setImageModel}
            />
            <ThemeToggle dark={darkMode} onToggle={() => setDarkMode(!darkMode)} />
          </div>
        </header>

        <main className="bg-grid flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center py-16">
                <div className="float-anim mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-600/15 ring-1 ring-indigo-500/20 shadow-xl shadow-indigo-500/10">
                  <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">A</span>
                </div>
                <h1 className="text-xl font-semibold text-slate-200">What would you like to do?</h1>
                <p className="mt-1.5 text-sm text-slate-500">Chat, search, code, or generate images.</p>
                <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-2.5">
                  {[
                    { label: 'Chat', desc: 'Ask anything', action: () => { setMode('chat'); inputRef.current?.focus(); } },
                    { label: 'Image', desc: 'Generate art', action: () => { setMode('image'); inputRef.current?.focus(); } },
                    { label: 'Code', desc: 'Write & run', action: () => { setMode('chat'); setInput('Write code to '); inputRef.current?.focus(); } },
                    { label: 'Research', desc: 'Search & analyze', action: () => { setMode('chat'); setInput('Research: '); inputRef.current?.focus(); } },
                  ].map((s) => (
                    <button key={s.label} onClick={s.action} className="card-lift flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left backdrop-blur-sm">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-sm font-bold text-pink-400">{s.label[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-slate-300">{s.label}</p>
                        <p className="text-[11px] text-slate-500">{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (<MessageBubble key={msg.id} msg={msg} />))}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </main>

        <footer className="border-t border-white/[0.06] px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <div className="nav-body mb-2">
              <ul className="nav-ul">
                <li className="nav-li">
                  <input type="radio" name="mode" id="mode-chat" className="nav-radio" checked={mode === 'chat'} onChange={() => setMode('chat')} />
                  <label htmlFor="mode-chat" className="nav-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  </label>
                </li>
                <li className="nav-li">
                  <input type="radio" name="mode" id="mode-image" className="nav-radio" checked={mode === 'image'} onChange={() => setMode('image')} />
                  <label htmlFor="mode-image" className="nav-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  </label>
                </li>
              </ul>
            </div>

            <div className="flex items-end gap-2">
              <div className="input-glow flex-1">
                <div className="glow-layer" />
                <div className="border-layer" />
                <div className="inner">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === 'image' ? 'Describe an image...' : 'Type a message...'}
                    rows={1}
                    className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
              {isStreaming ? (
                <button onClick={stop} className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20 transition hover:bg-red-500/20">
                  <div className="h-3 w-3 rounded-sm bg-red-400" />
                </button>
              ) : (
                <div className="btn-glow">
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/20 transition disabled:opacity-30"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 22-7z" /></svg>
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">Enter to send | Shift+Enter for new line</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

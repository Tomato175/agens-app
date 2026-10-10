import { useState } from 'react';

interface Props {
  open: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  conversations: Array<{ id: string; title: string; createdAt: number }>;
  activeId: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function Sidebar({ open, onNewChat, conversations, activeId, onSelect, onDelete }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <aside
      className={`flex flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-200 ${
        open ? 'w-64' : 'w-0 overflow-hidden border-r-0'
      }`}
    >
      {/* New chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300 transition hover:border-indigo-500/30 hover:bg-indigo-500/[0.06] hover:text-indigo-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-slate-300 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/30 focus:bg-indigo-500/[0.04]"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">
          {search ? `Results (${filtered.length})` : `History (${conversations.length})`}
        </p>
        {filtered.length === 0 && (
          <p className="px-1 text-xs text-slate-600">
            {search ? 'No matches found' : 'No conversations yet'}
          </p>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`group relative mb-0.5 flex items-center rounded-lg transition ${
              activeId === c.id
                ? 'bg-indigo-500/10 text-indigo-300'
                : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'
            }`}
          >
            <button
              onClick={() => onSelect(c.id)}
              className="flex-1 truncate px-2.5 py-2 text-left text-xs"
            >
              {c.title}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(c.id)}
                className="mr-1 hidden rounded p-1 text-slate-600 hover:text-red-400 group-hover:block"
                title="Delete"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-3">
        <p className="text-[10px] text-slate-600">Agent v1.0 | Agnes AI</p>
      </div>
    </aside>
  );
}

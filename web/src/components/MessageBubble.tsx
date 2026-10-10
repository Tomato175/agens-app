import { useState } from 'react';
import type { ChatMessage, ToolCallDisplay } from '../lib/types';

const toolLabels: Record<string, string> = {
  web_search: 'Search', web_scrape: 'Scrape', calculator: 'Math',
  http_request: 'HTTP', execute_code: 'Code',
};

const toolColors: Record<string, string> = {
  web_search: 'text-amber-400 bg-amber-500/10',
  web_scrape: 'text-cyan-400 bg-cyan-500/10',
  calculator: 'text-emerald-400 bg-emerald-500/10',
  http_request: 'text-rose-400 bg-rose-500/10',
  execute_code: 'text-violet-400 bg-violet-500/10',
};

function PlanCard({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="shimmer-border mb-3 rounded-lg border border-indigo-500/15 bg-indigo-500/[0.04] p-px">
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen(!open)}>
        <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/20 text-[10px] font-bold text-indigo-400">P</span>
        <span className="text-xs font-medium text-indigo-300">{steps.length} step plan</span>
        <svg className={`ml-auto h-3 w-3 text-indigo-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <ol className="px-3 pb-2.5 pl-8 text-xs text-slate-400 space-y-0.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[8px] text-indigo-400">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ToolCallCard({ tc }: { tc: ToolCallDisplay }) {
  const [expanded, setExpanded] = useState(false);
  const colorCls = toolColors[tc.tool] ?? 'text-slate-400 bg-slate-500/10';

  return (
    <div className={`card-lift cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.02] ${expanded ? 'border-white/[0.12]' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${colorCls}`}>
          {toolLabels[tc.tool]?.[0] ?? '?'}
        </div>
        <span className="text-xs font-medium text-slate-300">{toolLabels[tc.tool] ?? tc.tool}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {tc.status === 'done' && <span className="text-[10px] text-emerald-400">done</span>}
          {tc.status === 'running' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />}
          <svg className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </div>
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2">
          <div className="text-[11px] text-slate-500">
            <span className="font-medium text-slate-400">Args: </span>
            <code className="break-all">{JSON.stringify(tc.args)}</code>
          </div>
          {tc.result && (
            <div className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-black/20 p-2 text-[11px] text-slate-400">
              {tc.result.slice(0, 3000)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeBlock = '';

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        elements.push(<pre key={`c-${elements.length}`} className="my-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs"><code>{codeBlock}</code></pre>);
        codeBlock = ''; inCode = false;
      } else { inCode = true; }
      continue;
    }
    if (inCode) { codeBlock += line + '\n'; continue; }
    if (line.includes('[PLAN]') || line.includes('[/PLAN]')) continue;
    elements.push(<p key={`p-${elements.length}`} className="leading-relaxed">{line}</p>);
  }
  if (codeBlock) elements.push(<pre key="cf" className="my-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs"><code>{codeBlock}</code></pre>);
  return <div>{elements}</div>;
}

export default function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`msg-enter flex ${isUser ? 'justify-end' : 'justify-start'} py-3`}>
      <div className={`max-w-[80%] ${isUser ? 'ml-auto' : ''}`}>
        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-slate-700/80 to-slate-800/80 px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-sm">
            <MarkdownLite text={msg.content} />
          </div>
        ) : (
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <div className="float-anim flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white shadow-lg shadow-indigo-500/25">
                A
              </div>
              <span className="text-[11px] font-medium text-slate-500">Agent</span>
            </div>
            <div className="ml-9 text-sm text-slate-300">
              {msg.streaming && !msg.content && !msg.images?.length ? (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="stream-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span className="stream-dot h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span className="stream-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span className="ml-1 text-xs text-slate-500">Thinking</span>
                </div>
              ) : (
                msg.content && <MarkdownLite text={msg.content} />
              )}

              {msg.plan && msg.plan.length > 0 && <PlanCard steps={msg.plan} />}

              {msg.images && msg.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="Generated" className="h-48 w-48 cursor-pointer rounded-xl border border-white/[0.08] object-cover shadow-lg transition hover:scale-[1.02] hover:shadow-indigo-500/10" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {msg.toolCalls.map((tc) => (<ToolCallCard key={tc.id} tc={tc} />))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

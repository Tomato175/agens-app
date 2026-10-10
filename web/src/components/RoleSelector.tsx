import { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function RoleSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const custom = value.trim().length > 0;
  const label = custom ? value.trim().slice(0, 16) : '定位: 深度研究';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setDraft(value); setOpen(!open); }}
        title="设定 Agent 的定位 / 角色（系统提示词）"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        </svg>
        <span className="font-medium">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-white/[0.08] bg-[#141422] p-3 shadow-2xl">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">定位 / 角色（System Prompt）</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="例如：你是资深 AI 翻译专家，精通中英日互译……"
            className="w-full resize-none rounded-md border border-white/[0.08] bg-transparent p-2 text-xs text-slate-200 outline-none focus:border-indigo-400/40"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => { onChange(draft.trim()); setOpen(false); }}
              className="rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-300 transition hover:bg-indigo-500/25"
            >
              保存
            </button>
            <button
              onClick={() => { setDraft(''); onChange(''); setOpen(false); }}
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 transition hover:text-slate-300"
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
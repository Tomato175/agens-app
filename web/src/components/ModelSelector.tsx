import { useState, useEffect, useRef } from 'react';
import { fetchModels, type ModelInfo } from '../lib/api';

interface Props {
  selected: string;
  onSelect: (model: string) => void;
  imageSelected?: string;
  onImageSelect?: (model: string) => void;
}

export default function ModelSelector({ selected, onSelect, imageSelected, onImageSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels()
      .then((res) => {
        setModels(res.data);
        if (!selected && res.default) onSelect(res.default);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const textModels = models.filter((m) => !m.id.includes('image') && !m.id.includes('video'));
  const imageModels = models.filter((m) => m.id.includes('image'));
  const videoModels = models.filter((m) => m.id.includes('video'));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="font-medium">{selected || 'Model'}</span>
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-white/[0.08] bg-[#141422] p-1.5 shadow-2xl">
          <p className="px-1.5 py-1 text-[10px] uppercase tracking-wider text-slate-500">Chat</p>
          {textModels.map((m) => (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition ${
                selected === m.id ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <span>{m.name}</span>
              {selected === m.id && (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}

          {imageModels.length > 0 && (
            <>
              <p className="mt-1 px-1.5 py-1 text-[10px] uppercase tracking-wider text-slate-500">Image</p>
              {imageModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { if (onImageSelect) onImageSelect(m.id); else onSelect(m.id); setOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition ${
                    (imageSelected && imageSelected === m.id) || selected === m.id
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'text-slate-400 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{m.name}</span>
                </button>
              ))}
            </>
          )}

          {videoModels.length > 0 && (
            <>
              <p className="mt-1 px-1.5 py-1 text-[10px] uppercase tracking-wider text-slate-500">Video</p>
              {videoModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { if (onImageSelect) onImageSelect(m.id); else onSelect(m.id); setOpen(false); }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.04]"
                >
                  <span>{m.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

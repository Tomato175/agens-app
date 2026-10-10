import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.json');

export interface MemoryEntry {
  id: string;
  type: 'preference' | 'fact' | 'context';
  content: string;
  createdAt: string;
}

function ensureDir() {
  if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });
}

export function loadMemory(): MemoryEntry[] {
  ensureDir();
  if (!existsSync(MEMORY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveMemory(entries: MemoryEntry[]): void {
  ensureDir();
  writeFileSync(MEMORY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export function addMemory(type: MemoryEntry['type'], content: string): MemoryEntry {
  const entries = loadMemory();
  const entry: MemoryEntry = {
    id: `mem-${Date.now()}`,
    type,
    content,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  // Keep only last 200 entries
  if (entries.length > 200) entries.splice(0, entries.length - 200);
  saveMemory(entries);
  return entry;
}

export function getMemoryContext(): string {
  const entries = loadMemory();
  if (entries.length === 0) return '';

  const grouped: Record<string, string[]> = {};
  for (const e of entries) {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e.content);
  }

  const lines: string[] = ['[User Memory]'];
  if (grouped['preference']) lines.push(`Preferences: ${grouped['preference'].join('; ')}`);
  if (grouped['fact']) lines.push(`Known facts: ${grouped['fact'].join('; ')}`);
  if (grouped['context']) lines.push(`Context: ${grouped['context'].join('; ')}`);

  return lines.join('\n');
}

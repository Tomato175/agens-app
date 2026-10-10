import type { ToolDefinition } from './index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const codeExecutorTool: ToolDefinition = {
  name: 'execute_code',
  description: 'Execute a code snippet (Python or JavaScript) in a sandboxed environment. Returns stdout, stderr, and exit code. Use for calculations, data processing, file operations, and prototyping.',
  parameters: {
    type: 'object',
    properties: {
      language: { type: 'string', description: 'Programming language: python or javascript' },
      code: { type: 'string', description: 'The code to execute' },
    },
    required: ['language', 'code'],
  },
  execute: async (args) => {
    const lang = String(args.language ?? 'python');
    const code = String(args.code ?? '');
    if (!code) return 'Code is required.';

    const runtime = lang === 'javascript' ? 'node' : 'python3';
    const tmpFile = path.join(__dirname, `tmp_code_${Date.now()}.${lang === 'javascript' ? 'js' : 'py'}`);

    try {
      writeFileSync(tmpFile, code, 'utf-8');

      const result = await execAsync(
        `"${runtime}" "${tmpFile}"`,
        { timeout: 15000, maxBuffer: 1024 * 1024 },
      );

      unlinkSync(tmpFile);
      return result.stdout || result.stderr || '(no output)';
    } catch (err: any) {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      if (err.killed) return 'Execution timed out (15s limit).';
      return `Exit code: ${err.code ?? 1}\n${err.stdout ?? ''}\n${err.stderr ?? ''}`;
    }
  },
};

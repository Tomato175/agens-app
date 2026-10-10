import type { ToolDefinition } from './index.js';
import { evaluate } from 'mathjs';

export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: 'Evaluate a mathematical expression. Supports arithmetic, algebra, unit conversion, matrices, and more.',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'The math expression to evaluate, e.g. "2^10 + sqrt(144)"' },
    },
    required: ['expression'],
  },
  execute: async (args) => {
    const expr = String(args.expression ?? '');
    if (!expr) return 'Expression is required.';
    try {
      const result = evaluate(expr);
      return `= ${result.toString()}`;
    } catch (err) {
      return `Calculation error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

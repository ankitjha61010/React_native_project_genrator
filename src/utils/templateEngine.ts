/**
 * A deliberately tiny template engine.
 *
 *   {{APP_NAME}}                 variable
 *   {{IMPORT:components.AppText}} module specifier of another generated file
 *   {{SYMBOL:auth.logic}}         exported symbol name of another generated file
 *   {{#if FLAG}} … {{else}} … {{/if}}   conditional block (may be nested)
 *
 * Anything unknown is an error, so a typo in a template can never leak into a
 * generated project.
 */

export interface TemplateData {
  variables: Record<string, string>;
  flags: Record<string, boolean>;
  resolveImport: (id: string) => string;
  resolveSymbol: (id: string) => string;
}

export class TemplateError extends Error {
  constructor(message: string, readonly template?: string) {
    super(template ? `${template}: ${message}` : message);
    this.name = 'TemplateError';
  }
}

const BLOCK_RE = /\{\{#if (!?)([A-Z0-9_]+)\}\}|\{\{else\}\}|\{\{\/if\}\}/g;
// Variables are UPPER_CASE only, so JSX like `style={{flex}}` is never mistaken for one.
const TOKEN_RE = /\{\{(?:(IMPORT|SYMBOL):([A-Za-z0-9_.-]+)|([A-Z][A-Z0-9_]*))\}\}/g;

function renderConditionals(source: string, flags: Record<string, boolean>, name?: string): string {
  type Frame = { active: boolean; parentActive: boolean; seenElse: boolean; condition: boolean };
  const stack: Frame[] = [];
  let output = '';
  let cursor = 0;
  const isActive = () => (stack.length === 0 ? true : stack[stack.length - 1]!.active);

  for (const match of source.matchAll(BLOCK_RE)) {
    const index = match.index ?? 0;
    if (isActive()) {
      output += source.slice(cursor, index);
    }
    cursor = index + match[0].length;

    if (match[0].startsWith('{{#if')) {
      const flag = match[2]!;
      if (!(flag in flags)) {
        throw new TemplateError(`Unknown flag "${flag}"`, name);
      }
      const condition = match[1] === '!' ? !flags[flag] : Boolean(flags[flag]);
      const parentActive = isActive();
      stack.push({ active: parentActive && condition, parentActive, seenElse: false, condition });
    } else if (match[0] === '{{else}}') {
      const frame = stack[stack.length - 1];
      if (!frame || frame.seenElse) {
        throw new TemplateError('Unexpected {{else}}', name);
      }
      frame.seenElse = true;
      frame.active = frame.parentActive && !frame.condition;
    } else {
      if (!stack.pop()) {
        throw new TemplateError('Unexpected {{/if}}', name);
      }
      // Swallow the newline after a closing tag that sits on its own line.
      if (source[cursor] === '\n' && (output.endsWith('\n') || output === '')) {
        cursor += 1;
      }
      continue;
    }
    // Opening / else tags on their own line shouldn't leave blank lines behind.
    if (source[cursor] === '\n' && (output.endsWith('\n') || output === '')) {
      cursor += 1;
    }
  }

  if (stack.length > 0) {
    throw new TemplateError('Missing {{/if}}', name);
  }
  if (isActive()) {
    output += source.slice(cursor);
  }
  return output;
}

export function renderTemplate(source: string, data: TemplateData, name?: string): string {
  const withBlocks = renderConditionals(source, data.flags, name);

  return withBlocks.replace(
    TOKEN_RE,
    (_match, kind: string | undefined, ref: string | undefined, variable: string | undefined) => {
      if (kind === 'IMPORT') {
        return data.resolveImport(ref!);
      }
      if (kind === 'SYMBOL') {
        return data.resolveSymbol(ref!);
      }
      if (!(variable! in data.variables)) {
        throw new TemplateError(`Unknown variable "${variable}"`, name);
      }
      return data.variables[variable!]!;
    },
  );
}

/** Lists every placeholder in a template – used by tests to validate templates. */
export function listPlaceholders(source: string): { imports: string[]; symbols: string[]; variables: string[]; flags: string[] } {
  const imports: string[] = [];
  const symbols: string[] = [];
  const variables: string[] = [];
  const flags: string[] = [];
  for (const m of source.matchAll(TOKEN_RE)) {
    if (m[1] === 'IMPORT') imports.push(m[2]!);
    else if (m[1] === 'SYMBOL') symbols.push(m[2]!);
    else variables.push(m[3]!);
  }
  for (const m of source.matchAll(BLOCK_RE)) {
    if (m[2]) flags.push(m[2]);
  }
  return { imports, symbols, variables, flags };
}

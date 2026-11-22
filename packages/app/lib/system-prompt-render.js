import os from 'node:os';

// Native presets reference only these six host variables. Resolve them without
// Git subprocesses, memory-directory assumptions, or evaluating user text.
export function createSystemPromptVariables(model, env = process.env) {
  return {
    'model.name': typeof model === 'string' ? model : '',
    'environment.lang': String(env.LANG || 'en').split('.')[0].replaceAll('_', '-'),
    'os.platform': os.platform(),
    'os.version': os.version(),
    'os.arch': os.arch(),
    'os.shell': env.SHELL || '',
  };
}

export function renderSystemPromptText(text, variables) {
  return text.replace(/\$\{([^{}]+)\}/g, (literal, name) => Object.hasOwn(variables, name) ? variables[name] : literal);
}

export const SYSTEM_PROMPT_VARIABLES_DOC = `# Dynamic Parameters

| Parameter | Native value |
| --- | --- |
| \`\${model.name}\` | Effective model for the new thread |
| \`\${environment.lang}\` | Host language locale |
| \`\${os.platform}\` | Operating system platform |
| \`\${os.version}\` | Operating system version |
| \`\${os.arch}\` | CPU architecture |
| \`\${os.shell}\` | Host shell |

These values are resolved when a supported native thread is created. Unknown placeholders remain literal text. Existing resumed/forked threads retain their original instructions. Memory follows the instructions and capabilities supplied by the Codex host; no memory directory is created by this renderer.
`;

import { isAskToolName, isPlanToolName } from './toolNameAliases.js';

// Share the existing native full-card policy with minimal-run boundaries.
export function isFullDisplayTool(name) {
  return name === 'apply_patch' || isAskToolName(name) || isPlanToolName(name) || name === 'Workflow';
}

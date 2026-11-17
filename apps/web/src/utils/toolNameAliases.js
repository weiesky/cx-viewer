export const CODEX_PLAN_TOOL_NAME = 'update_plan';
export const PLAN_TOOL_NAMES = Object.freeze([CODEX_PLAN_TOOL_NAME]);

export const CODEX_ASK_TOOL_NAME = 'request_user_input';
export const ASK_TOOL_NAMES = Object.freeze([CODEX_ASK_TOOL_NAME]);

export function isPlanToolName(name) {
  return name === CODEX_PLAN_TOOL_NAME;
}

export function isAskToolName(name) {
  return name === CODEX_ASK_TOOL_NAME;
}

import { stripPrivateKeys } from './helpers';

// Context 标签页「原文」视图的文本组装（唯一实现，ContextTab 不内联第二份）。
// 口径与 DetailPanel Request/Response 标签 text 模式一致：stripPrivateKeys 剥掉
// 前端注入的 _ 前缀键（如 _timestamp）→ 字符串原样输出（不加引号包裹）、其余
// JSON.stringify 两空格缩进。
// 旧 turn 节点仍按 [userMsg, assistantMsg] 兼容；当前 input 节点直接输出对应
// body.input[index] 的原始项。
export function buildContextItemRawText(item) {
  if (!item) return '';
  const raw = item.isTurn
    ? [item.rawUser, item.rawAssistant].filter(Boolean)
    : item.raw;
  if (raw == null) return '';
  const clean = typeof raw === 'object' ? stripPrivateKeys(raw) : raw;
  return typeof clean === 'string' ? clean : JSON.stringify(clean, null, 2);
}

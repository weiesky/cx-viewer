#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ULTRAPLAN_VARIANTS } from '../src/utils/ultraplanTemplates.js';
import { isLocalizedText, validateUltraAgentId } from '../server/lib/ultra-agents-api.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, 'ultraAgents', 'manifest.json');
const OUTPUT_DIR = join(ROOT, 'ultraAgents');
const LOCALES = ['ar', 'da', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'no', 'pl', 'pt-BR', 'ru', 'th', 'tr', 'uk', 'zh-TW', 'zh'];
const checkOnly = process.argv.includes('--check');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const mismatches = [];

function syncFile(path, expected) {
  let current = null;
  try { current = readFileSync(path, 'utf8'); } catch { /* generated file missing */ }
  if (current === expected) return;
  if (checkOnly) {
    mismatches.push(path.slice(ROOT.length + 1));
    return;
  }
  writeFileSync(path, expected, 'utf8');
}

function validateManifest() {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.agents)) {
    throw new Error('ultraAgents/manifest.json must use schemaVersion 1 and contain agents[]');
  }
  const seen = new Set();
  const seenVariants = new Set();
  for (const agent of manifest.agents) {
    if (!agent || !validateUltraAgentId(agent.id) || seen.has(agent.id)) throw new Error('manifest agent ids must be unique and path-safe');
    if (typeof ULTRAPLAN_VARIANTS[agent.variant] !== 'string') throw new Error(`unknown UltraPlan variant: ${agent.variant}`);
    if (seenVariants.has(agent.variant)) throw new Error(`manifest variant is duplicated: ${agent.variant}`);
    if (!Number.isInteger(agent.version) || agent.version < 1) throw new Error(`invalid version for ${agent.id}`);
    if (!isLocalizedText(agent.title) || !isLocalizedText(agent.description)) throw new Error(`invalid title/description for ${agent.id}`);
    const outputPath = resolve(OUTPUT_DIR, `${agent.id}.json`);
    if (!outputPath.startsWith(`${resolve(OUTPUT_DIR)}${sep}`)) throw new Error(`unsafe output path for ${agent.id}`);
    seen.add(agent.id);
    seenVariants.add(agent.variant);
  }
  for (const variant of ['codeExpert', 'researchExpert']) {
    if (!manifest.agents.some((agent) => agent.variant === variant)) throw new Error(`manifest is missing ${variant}`);
  }
}

function generatedAgent(agent) {
  return `${JSON.stringify({
    id: agent.id,
    version: agent.version,
    title: agent.title,
    description: agent.description,
    content: ULTRAPLAN_VARIANTS[agent.variant],
  }, null, 2)}\n`;
}

function rawTemplatesSection(language) {
  const zh = language === 'zh' || language === 'zh-TW';
  return [
    '<!-- ULTRAPLAN_RAW_TEMPLATES:START (generated; run npm run sync:ultraplan-presets) -->',
    zh ? '## 实际提示词原文' : '## Raw prompt templates',
    '',
    zh
      ? '以下内容由 `src/utils/ultraplanTemplates.js` 自动同步，是 UltraPlan 实际发送的指令。请勿直接编辑本区。'
      : 'This generated section mirrors the exact instructions sent by UltraPlan from `src/utils/ultraplanTemplates.js`. Do not edit it directly.',
    '',
    zh ? '### 代码专家' : '### Code Expert',
    '',
    '<textarea readonly>',
    ULTRAPLAN_VARIANTS.codeExpert,
    '</textarea>',
    '',
    zh ? '### 调研专家' : '### Research Expert',
    '',
    '<textarea readonly>',
    ULTRAPLAN_VARIANTS.researchExpert,
    '</textarea>',
    '<!-- ULTRAPLAN_RAW_TEMPLATES:END -->',
    '',
  ].join('\n');
}

function ultraPlanDoc(language) {
  const zh = language === 'zh' || language === 'zh-TW';
  const prose = zh ? [
    '# UltraPlan — 至尊许愿机',
    '',
    '## 什么是 UltraPlan',
    '',
    'UltraPlan 是 CX Viewer 面向 Codex 的本地多智能体工作流。它先让不同专家并行探索，再汇总并评审计划，得到批准后才执行。',
    '',
    'UltraPlan 提供两个内置角色，也允许创建、排序、隐藏自定义专家：',
    '',
    '- **代码专家**：理解代码架构、定位修改文件、评估风险、制定并执行实施计划，并在产生代码改动后组织多视角审查。',
    '- **调研专家**：明确范围和受众，从权威与时效来源并行检索，交叉求证事实，区分证据、冲突与推断，最后产出带引用的结构化结论。',
    '',
    '## 使用须知',
    '',
    '- UltraPlan 适合边界明确、需要多角度探索和复核的中大型任务，并不保证任何愿望都能实现。',
    '- 一次完整运行通常较久，也需要充足的上下文窗口；长任务开始前应清理无关上下文。',
    '- 涉及时效事实、法律、医疗、金融或重大决策时，应要求联网核验并优先使用一手权威来源。',
    '- 预设模板只是载入自定义专家编辑器的副本；载入或修改它不会改变两个内置角色。',
    '',
    '## 运行流程',
    '',
    '1. 任务含糊时，先澄清范围、平台、受众和交付物。',
    '2. 并行派遣专家探索独立维度，主代理保留综合与决策责任。',
    '3. 汇总发现并形成包含文件、步骤、验证和风险的详细计划。',
    '4. 再由不同视角的专家审查计划，修正遗漏后提交批准。',
    '5. 执行获批计划，按任务类型完成测试、事实核验或产物检查。',
    '6. 若产生代码改动，进行多视角代码审查并处理高优先级问题。',
    '',
  ] : [
    '# UltraPlan — The Ultimate Wishing Machine',
    '',
    '## What is UltraPlan',
    '',
    'UltraPlan is CX Viewer’s local multi-agent workflow for Codex. Specialists explore a task in parallel, their findings converge into a reviewed plan, and execution begins only after approval.',
    '',
    'UltraPlan includes two built-in roles and supports custom experts that can be created, reordered, or hidden:',
    '',
    '- **Code Expert** understands architecture, identifies affected files, evaluates risks, plans and implements changes, and reviews non-trivial code diffs from multiple perspectives.',
    '- **Research Expert** clarifies scope and audience, searches authoritative and current sources in parallel, cross-checks facts, separates evidence from conflicts and inference, and produces structured findings with citations.',
    '',
    '## Important notes',
    '',
    '- UltraPlan works best for bounded, medium-to-large tasks that benefit from parallel exploration and review; it cannot guarantee every desired outcome.',
    '- A complete run can take substantial time and context. Clear unrelated context before starting a long task.',
    '- Time-sensitive, legal, medical, financial, or consequential claims should be checked online against primary authoritative sources.',
    '- A preset is a copy loaded into the custom-expert editor. Loading or editing it does not change either built-in role.',
    '',
    '## Workflow',
    '',
    '1. Clarify ambiguous scope, platforms, audience, and deliverables.',
    '2. Dispatch specialists to explore independent dimensions while the main agent retains synthesis and decision responsibility.',
    '3. Consolidate findings into a detailed plan with files, ordered steps, validation, and risks.',
    '4. Have reviewers examine the plan from different perspectives, then submit the revised plan for approval.',
    '5. Execute the approved plan and run the tests, fact checks, or artifact validation appropriate to the task.',
    '6. When code changed, conduct a multi-perspective review and address high-priority findings.',
    '',
  ];
  return `${prose.join('\n')}\n${rawTemplatesSection(language)}`;
}

function customExpertDoc(language) {
  const zh = language === 'zh' || language === 'zh-TW';
  const lines = zh ? [
    '# 自定义 UltraPlan 专家',
    '',
    '自定义专家是一段可编辑的指令模板。名称只用于界面显示，真正发送给 Codex 的是正文。专家会保存在 CX Viewer preferences 中，可在 UltraPlan 的专家管理器里排序、隐藏、编辑或删除。',
    '',
    '## 从预设开始',
    '',
    '点击“载入模板”可把代码专家或调研专家复制到编辑器。若当前内容已经修改，CX Viewer 会先确认再覆盖。载入得到的是自定义副本，不会修改内置专家。',
    '',
    '## 正文外壳',
    '',
    '推荐完整正文以 `<user_instructions>` 开头并以 `</user_instructions>` 结尾。若只填写裸正文，发送时会自动补上带作用域说明的外壳；已经带外壳的内容不会重复包裹。',
    '',
    '```text',
    '<user_instructions>',
    '[SCOPED INSTRUCTION] These instructions apply only to this task.',
    '',
    'Define the role, workflow, validation, and final deliverable here.',
    '</user_instructions>',
    '```',
    '',
    '## 编写顺序',
    '',
    '1. **角色与目标**：说明专家要解决的问题，以及不在范围内的事项。',
    '2. **澄清条件**：列出哪些歧义必须使用 `request_user_input` 确认。',
    '3. **工具与并行方式**：只写当前 Codex 实际可用的工具；需要多代理时说明角色分工和并发上限。',
    '4. **工作流**：给出有序步骤、暂停点、批准条件和失败时的处理方式。',
    '5. **质量门槛**：定义测试、来源核验、审查、兼容性或安全检查。',
    '6. **交付格式**：明确最终输出结构、文件位置、引用方式和需要披露的限制。',
    '',
    '## 调研专家的裁剪原则',
    '',
    '- 明确受众、地区、时间范围、比较对象与交付格式。',
    '- 对可能变化的事实联网核验，优先官方文件、标准、原始论文、备案数据或一手数据集。',
    '- 区分发布日期和事件发生日期；重要结论至少交叉求证一次。',
    '- 将事实、冲突证据、未知项、假设和推断分别标注，并让引用紧邻所支持的说法。',
    '- 只有需要生成代码或 Demo 时才加入实现与代码审查步骤。',
    '',
    '## 常见问题',
    '',
    '- 不要使用其他代理平台专有的工具名或提示词外壳。',
    '- 不要把“尽可能详细”当作质量标准；应给出可验证的完成条件。',
    '- 不要要求不存在的工具必须成功加载；应说明缺失时如何报告并停下。',
    '- 不要在模板里放密钥、个人信息或不应发送给模型的内部数据。联网调研和附件上传前也应确认数据边界。',
    '',
  ] : [
    '# Custom UltraPlan experts',
    '',
    'A custom expert is an editable instruction template. Its title is only a UI label; the content is what CX Viewer sends to Codex. Experts are stored in CX Viewer preferences and can be reordered, hidden, edited, or deleted from the UltraPlan expert manager.',
    '',
    '## Start from a preset',
    '',
    'Use **Load template** to copy Code Expert or Research Expert into the editor. CX Viewer asks before overwriting modified content. The loaded expert is a custom copy and does not alter either built-in expert.',
    '',
    '## Instruction wrapper',
    '',
    'A complete template should start with `<user_instructions>` and end with `</user_instructions>`. Bare content receives a scoped wrapper when sent; content that already has the wrapper is not wrapped twice.',
    '',
    '```text',
    '<user_instructions>',
    '[SCOPED INSTRUCTION] These instructions apply only to this task.',
    '',
    'Define the role, workflow, validation, and final deliverable here.',
    '</user_instructions>',
    '```',
    '',
    '## Authoring order',
    '',
    '1. **Role and objective**: define the problem and explicit exclusions.',
    '2. **Clarification conditions**: list ambiguities that require `request_user_input`.',
    '3. **Tools and parallel work**: name only tools available in the current Codex environment and define agent roles and concurrency limits.',
    '4. **Workflow**: provide ordered steps, approval points, and failure behavior.',
    '5. **Quality gates**: define tests, source checks, review, compatibility, and safety requirements.',
    '6. **Deliverable**: specify output structure, file locations, citation style, and limitations to disclose.',
    '',
    '## Adapting the research preset',
    '',
    '- Define audience, geography, time range, comparison set, and output format.',
    '- Verify facts that may have changed online, preferring official documents, standards, original papers, filings, or first-party datasets.',
    '- Separate publication dates from event dates and independently confirm important claims.',
    '- Label facts, conflicting evidence, unknowns, assumptions, and inferences; keep citations next to the claims they support.',
    '- Add implementation and code-review steps only when the task actually produces code or a demo.',
    '',
    '## Common pitfalls',
    '',
    '- Do not use tool names or instruction wrappers from another agent platform.',
    '- Do not use “be very detailed” as the only quality requirement; define verifiable completion criteria.',
    '- Do not assume unavailable tools can be loaded; say how to report the limitation and stop safely.',
    '- Never embed secrets, personal data, or internal material that should not be sent to a model. Confirm data boundaries before web research or attachment upload.',
    '',
  ];
  return `<!-- Generated by scripts/sync-ultraplan-presets.mjs; edit that source instead. -->\n${lines.join('\n')}`;
}

validateManifest();
for (const agent of manifest.agents) syncFile(join(OUTPUT_DIR, `${agent.id}.json`), generatedAgent(agent));
for (const locale of LOCALES) {
  syncFile(join(ROOT, 'concepts', locale, 'UltraPlan.md'), ultraPlanDoc(locale));
  syncFile(join(ROOT, 'concepts', locale, 'CustomUltraplanExpert.md'), customExpertDoc(locale));
}

if (mismatches.length) {
  console.error(`UltraPlan generated files are stale:\n${mismatches.map((path) => `- ${path}`).join('\n')}`);
  process.exit(1);
}

if (!checkOnly) console.log('UltraPlan presets and documentation synchronized.');

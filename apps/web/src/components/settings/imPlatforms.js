// Only DingTalk has a live descriptor. Historical badges keep their lightweight icon mapping.
import DingTalkIcon from '../common/DingTalkIcon';
import FeishuIcon from '../common/FeishuIcon';
import WeComIcon from '../common/WeComIcon';
import DiscordIcon from '../common/DiscordIcon';

export const dingtalkDescriptor = {
  id: 'dingtalk',
  labelKey: 'ui.messaging.dingtalk',
  fallback: 'DingTalk',
  icon: DingTalkIcon,
  color: '#1677ff',
  endpoints: { status: '/api/im/dingtalk/status', config: '/api/im/dingtalk/config', test: '/api/im/dingtalk/test' },
  enable: { key: 'ui.dingtalk.enable', fallback: 'Enable DingTalk bridge' },
  fields: [
    { key: 'appKey', type: 'text', section: 'main', required: true, labelKey: 'ui.dingtalk.appKey', fallback: 'AppKey' },
    { key: 'appSecret', type: 'password', section: 'main', required: true, labelKey: 'ui.dingtalk.appSecret', fallback: 'AppSecret' },
    {
      key: 'allowStaffIds', type: 'tags', section: 'more', optional: true,
      labelKey: 'ui.dingtalk.allowStaff', fallback: 'Sender allowlist (staffId)',
      placeholderKey: 'ui.dingtalk.allowStaffPlaceholder', placeholderFallback: 'staffId, press Enter to add',
      helpKey: 'ui.im.allowlistOptionalHelp', helpFallback: 'Optional. When set, only listed staff IDs are accepted; when empty, messages from any sender are accepted.',
    },
    {
      key: 'ackCard', type: 'switch', section: 'more', default: true,
      labelKey: 'ui.im.ackCard', fallback: 'Instant acknowledgment',
      helpKey: 'ui.im.ackCardHelp', helpFallback: 'Send immediate status feedback when a message is received; update in-place when the reply is ready.',
    },
    {
      key: 'cardTemplateId', type: 'text', section: 'more', optional: true,
      labelKey: 'ui.dingtalk.cardTemplateId', fallback: 'Card Template ID',
      helpKey: 'ui.dingtalk.cardTemplateIdHelp', helpFallback: 'Interactive Card template ID from the DingTalk Open Platform (optional — leave empty for plain-text acknowledgment).',
    },
    {
      key: 'aiCardTemplateId', type: 'text', section: 'more', optional: true,
      labelKey: 'ui.dingtalk.aiCardTemplateId', fallback: 'AI Card Template ID (streaming)',
      helpKey: 'ui.dingtalk.aiCardTemplateIdHelp', helpFallback: 'AI-card scene template ID (must declare content + flowStatus variables). Replies stream into the card when configured.',
    },
    {
      key: 'aiCardStreamKey', type: 'text', section: 'more', optional: true,
      labelKey: 'ui.dingtalk.aiCardStreamKey', fallback: 'AI Card streaming variable name (default: content)',
      helpKey: 'ui.dingtalk.aiCardStreamKeyHelp', helpFallback: 'Name of the streaming markdown variable in the AI-card template; leave empty to use content.',
    },
  ],
  notes: [],
};

// DingTalk is the only integration with a live backend. Keep the legacy export as the available
// list so existing settings/header consumers cannot accidentally poll unimplemented endpoints.
export const AVAILABLE_IM_PLATFORMS = [dingtalkDescriptor];
export const IM_PLATFORMS = AVAILABLE_IM_PLATFORMS;

// Brand icon + color per id, for the chat IM-source badge (⟦im:<id>⟧).
export const IM_SOURCE_ICONS = {
  dingtalk: { Icon: DingTalkIcon, color: '#1677ff' },
  feishu: { Icon: FeishuIcon, color: '#00d6b9' },
  wecom: { Icon: WeComIcon, color: '#07c160' },
  discord: { Icon: DiscordIcon, color: '#5865f2' },
};

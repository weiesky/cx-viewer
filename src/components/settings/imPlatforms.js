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

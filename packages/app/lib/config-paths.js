import { join } from 'node:path';
import { LOG_DIR } from '../findcx.js';

export const DINGTALK_IM_ID = 'dingtalk';
export function getPreferencesPath() { return join(LOG_DIR, 'preferences.json'); }
export function getDingTalkImRoot(logDir = LOG_DIR) { return join(logDir, 'im', DINGTALK_IM_ID); }
export function getDingTalkImConfigPath(logDir = LOG_DIR) { return join(getDingTalkImRoot(logDir), 'config.json'); }

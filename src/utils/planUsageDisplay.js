import { extractLatestPlanUsage } from './rateLimitParser.js';

export function getPlanUsageSourceKey({ isLocalLog = false, localLogFile = null, projectName = '' } = {}) {
  return isLocalLog
    ? `local:${localLogFile || ''}`
    : `live:${projectName || ''}`;
}

export function buildPlanUsageSnapshot(requests) {
  const planUsage = extractLatestPlanUsage(requests);
  return {
    planUsage,
    signature: planUsage ? JSON.stringify(planUsage) : null,
  };
}

export function shouldDisplayPlanUsage({ planUsage = null, isLocalLog = false, authType = null } = {}) {
  return !!planUsage || (!isLocalLog && authType === 'OAuth');
}

export function transitionPlanUsage(current = {}, { sourceKey, requestsChanged = false, requests = [] } = {}) {
  const previousSourceKey = current.sourceKey;
  const hadSource = previousSourceKey !== undefined;
  const sourceChanged = previousSourceKey !== sourceKey;
  const baselineSignature = sourceChanged ? null : (current.signature ?? null);

  if (sourceChanged && hadSource && !requestsChanged) {
    return {
      sourceKey,
      signature: null,
      planUsage: null,
      shouldSetState: current.planUsage !== null,
    };
  }
  if (!requestsChanged) {
    return {
      sourceKey,
      signature: baselineSignature,
      planUsage: current.planUsage ?? null,
      shouldSetState: false,
    };
  }

  const next = buildPlanUsageSnapshot(requests);
  return {
    sourceKey,
    signature: next.signature,
    planUsage: next.planUsage,
    shouldSetState: next.signature !== baselineSignature
      || (next.planUsage === null) !== (current.planUsage === null),
  };
}

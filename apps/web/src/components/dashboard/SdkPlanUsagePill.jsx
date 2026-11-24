import React, { useEffect, useState } from 'react';
import UsageWindowPill from './UsageWindowPill';
import { apiUrl } from '../../utils/apiUrl';

export default function SdkPlanUsagePill() {
  const [planUsage, setPlanUsage] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const instance = new URLSearchParams(window.location.search).get('instance');
    const url = apiUrl('/api/sdk-plan-usage');
    let timer;
    const refresh = async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error('Plan usage unavailable');
        const data = await res.json();
        if (!controller.signal.aborted && new URLSearchParams(window.location.search).get('instance') === instance
            && (!instance || data.instanceKey === instance)) setPlanUsage(data.planUsage ?? null);
      } catch {
        if (!controller.signal.aborted) setPlanUsage(null);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 60000);
      }
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return <UsageWindowPill planUsage={planUsage} />;
}

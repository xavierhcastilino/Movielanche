import { useEffect, useState } from 'react';
import { getDemoPreferences, PREFERENCES_CHANGED, type DemoPreferences } from '../utils/preferences';

export function useDemoPreferences(): DemoPreferences {
  const [preferences, setPreferences] = useState(getDemoPreferences);

  useEffect(() => {
    const refresh = () => setPreferences(getDemoPreferences());
    window.addEventListener(PREFERENCES_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PREFERENCES_CHANGED, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return preferences;
}

import { useState, useEffect } from 'react';

export function useTheme() {
  // Default to light theme - no localStorage persistence
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    // localStorage persistence removed
  }, [isDark]);

  const toggle = () => setIsDark(!isDark);

  return { isDark, toggle };
}
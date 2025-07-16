import { useState, useEffect } from 'react';

export function useTheme() {
  // Restore theme preference from localStorage
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('dark-mode');
    // Handle both string 'true'/'false' and serialized JSON boolean values
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    // Save theme preference to localStorage
    localStorage.setItem('dark-mode', JSON.stringify(isDark));
  }, [isDark]);

  const toggle = () => setIsDark(!isDark);

  return { isDark, toggle };
}
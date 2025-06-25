import { useCallback } from 'react';

export function useSmoothScroll() {
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
<<<<<<< Updated upstream
      const navHeight = 80; // Account for fixed navigation
      const elementPosition = element.offsetTop - navHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth',
=======
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
>>>>>>> Stashed changes
      });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  return { scrollToSection, scrollToTop };
}

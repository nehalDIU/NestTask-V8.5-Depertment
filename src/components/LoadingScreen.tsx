import { useEffect, useState, memo, useRef } from 'react';

interface LoadingScreenProps {
  minimumLoadTime?: number;
  showProgress?: boolean;
}

// Using memo for better performance
export const LoadingScreen = memo(function LoadingScreen({ 
  minimumLoadTime = 300, 
  showProgress = false 
}: LoadingScreenProps) {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const startTimeRef = useRef(Date.now());
  
  // Simplified effect without asset preloading (moved to main.tsx)
  useEffect(() => {
    // Calculate how much time has already passed
    const elapsedTime = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);
    
    // Use a single timeout for the entire loading process
    const timer = setTimeout(() => {
      // Start fade out animation before completely hiding
      setFadeOut(true);
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        setShow(false);
      }, 200); // Reduced from 300ms to 200ms
    }, remainingTime);

    // Simplified progress animation with fewer updates
    if (showProgress) {
      let progressInterval: number;
      
      progressInterval = window.setInterval(() => {
        setProgress(prev => {
          // Faster progress increase
          const increment = 100 - prev > 50 ? 15 : (100 - prev > 20 ? 8 : 3);
          const next = prev + increment;
          return next > 96 ? 96 : next; // Cap at 96% to avoid jumps
        });
      }, 300); // Longer interval = fewer updates = better performance
      
      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }

    return () => clearTimeout(timer);
  }, [minimumLoadTime, showProgress]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50 transition-opacity duration-200 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center">
        {/* Simpler loading indicator with better performance */}
        <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        
        <div className="text-base font-medium text-gray-800/90 dark:text-gray-100/90 mt-3 tracking-wide">
          NestTask
        </div>
        
        {showProgress && (
          <div className="w-28 mx-auto mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-0.5 rounded-full" 
                style={{ width: `${progress}%`, transition: 'width 150ms ease-out' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// CSS for the spinner is in index.html as inline critical CSS
// .spinner {
//   width: 40px;
//   height: 40px;
//   border: 3px solid #e0e7ff;
//   border-radius: 50%;
//   border-top-color: #3b82f6;
//   animation: spin 1s linear infinite;
// }
// @keyframes spin {
//   to { transform: rotate(360deg); }
// }
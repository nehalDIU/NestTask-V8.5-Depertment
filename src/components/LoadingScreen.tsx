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
  
  // Single effect for all loading operations
  useEffect(() => {
    // Calculate how much time has already passed
    const elapsedTime = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);
    
    // Use a single timeout for everything
    const timer = setTimeout(() => {
      setFadeOut(true);
      
      // Remove from DOM after animation completes
      setTimeout(() => setShow(false), 180);
    }, remainingTime);

    // Handle progress updates with fewer state changes
    if (showProgress) {
      let progressTimer: number;
      let currentProgress = 0;
      
      const updateProgress = () => {
        // Calculate a larger increment to reduce updates
        const increment = 100 - currentProgress > 50 ? 18 : (100 - currentProgress > 20 ? 10 : 5);
        currentProgress += increment;
        
        if (currentProgress > 96) currentProgress = 96;
        
        // Update state less frequently
        setProgress(currentProgress);
        
        // Schedule next update with larger interval
        if (currentProgress < 96 && show) {
          progressTimer = window.setTimeout(updateProgress, 400);
        }
      };
      
      // Start progress updates
      progressTimer = window.setTimeout(updateProgress, 200);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(progressTimer);
      };
    }

    return () => clearTimeout(timer);
  }, [minimumLoadTime, showProgress]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50 transition-opacity duration-180 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center">
        {/* Inline SVG spinner for better performance */}
        <svg width="32" height="32" viewBox="0 0 32 32" className="text-blue-600 dark:text-blue-400">
          <circle cx="16" cy="16" r="14" 
            fill="none" 
            stroke="currentColor" 
            strokeOpacity="0.2" 
            strokeWidth="4" 
          />
          <path
            d="M16 2 A14 14 0 0 1 30 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 16 16"
              to="360 16 16"
              dur="0.75s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
        
        <div className="text-base font-medium text-gray-800/90 dark:text-gray-100/90 mt-3 tracking-wide">
          NestTask
        </div>
        
        {showProgress && (
          <div className="w-28 mx-auto mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-0.5 rounded-full" 
                style={{ 
                  width: `${progress}%`, 
                  transitionProperty: 'width',
                  transitionDuration: '120ms',
                  transitionTimingFunction: 'ease-out' 
                }}
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
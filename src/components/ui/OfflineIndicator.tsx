import { useEffect, useState, useRef } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Check connection status and performance
  useEffect(() => {
    // Update offline status when network status changes
    const handleOnline = () => {
      setIsOffline(false);
      
      // When coming back online, check connection quality
      checkConnectionQuality();
      
      // Show for 3 seconds then hide
      setShowIndicator(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setShowIndicator(false);
        setIsSlowConnection(false);
      }, 3000);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setShowIndicator(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    
    // Function to check connection quality
    const checkConnectionQuality = () => {
      // Use Navigator Connection API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        
        if (connection) {
          // Check if we're on a slow connection
          const isSlow = connection.effectiveType === '2g' || 
                         connection.effectiveType === 'slow-2g' || 
                         connection.downlink < 0.5;
          
          setIsSlowConnection(isSlow);
          
          // Show slow connection warning if needed
          if (isSlow) {
            setShowIndicator(true);
            
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
              setShowIndicator(false);
            }, 5000);
          }
        }
      }
    };
    
    // Initial check
    setIsOffline(!navigator.onLine);
    
    if (navigator.onLine) {
      checkConnectionQuality();
    }
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodically check connection quality (use less frequent checks to save battery)
    connectionCheckRef.current = setInterval(checkConnectionQuality, 30000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, []);
  
  // If online and not showing temporary status, don't render anything
  if (!isOffline && !isSlowConnection && !showIndicator) {
    return null;
  }
  
  return (
    <div 
      className={`fixed bottom-16 left-0 right-0 mx-auto max-w-md py-2 px-4 rounded-md shadow-lg transition-all duration-300 ${
        showIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${
        isOffline 
          ? 'bg-red-500 text-white' 
          : isSlowConnection 
            ? 'bg-amber-500 text-white' 
            : 'bg-green-500 text-white'
      }`}
      style={{ 
        width: '90%', 
        maxWidth: '400px',
        zIndex: 50,
        transform: showIndicator ? 'translateY(0)' : 'translateY(1rem)',
        pointerEvents: 'none' 
      }}
    >
      <div className="flex items-center justify-center space-x-2">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">You are offline</span>
          </>
        ) : isSlowConnection ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Slow connection detected</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </>
        )}
      </div>
    </div>
  );
}; 
import { useEffect, useState, useRef } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

export const OfflineIndicator = () => {
  const [status, setStatus] = useState<'online' | 'offline' | 'slow' | null>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  // More efficient single effect approach
  useEffect(() => {
    // Combined handlers for better performance
    const handleNetworkChange = () => {
      const isOnline = navigator.onLine;
      
      // Clear any existing timeouts
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (isOnline) {
        // Check connection quality when online
        checkConnectionQuality();
      } else {
        // Show offline status immediately
        setStatus('offline');
        setVisible(true);
      }
    };
    
    // Optimized connection quality check
    const checkConnectionQuality = () => {
      // Skip if offline
      if (!navigator.onLine) return;
      
      const connection = (navigator as any).connection;
      
      if (connection) {
        // Use effectiveType for more reliable detection
        const isOnSlow = connection.effectiveType === '2g' || 
                         connection.effectiveType === 'slow-2g' || 
                         (connection.downlink && connection.downlink < 0.5);
        
        if (isOnSlow) {
          setStatus('slow');
          setVisible(true);
          
          // Hide after 5 seconds
          timeoutRef.current = window.setTimeout(() => {
            setVisible(false);
          }, 5000);
        } else if (status !== 'online') {
          // Show online message only when changing from offline/slow
          setStatus('online');
          setVisible(true);
          
          // Hide after 3 seconds
          timeoutRef.current = window.setTimeout(() => {
            setVisible(false);
          }, 3000);
        }
      }
    };
    
    // Do initial check
    handleNetworkChange();
    
    // Attach event listeners for online/offline events
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Check connection quality less frequently to save battery
    checkIntervalRef.current = window.setInterval(checkConnectionQuality, 60000);
    
    // Cleanup function
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [status]);
  
  // Don't render if not visible
  if (!visible || status === null) {
    return null;
  }
  
  // Simplified, performance-optimized UI
  return (
    <div 
      className={`fixed bottom-16 left-0 right-0 mx-auto py-2 px-4 rounded-md shadow-lg z-50 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${
        status === 'offline' 
          ? 'bg-red-500 text-white' 
          : status === 'slow' 
            ? 'bg-amber-500 text-white' 
            : 'bg-green-500 text-white'
      }`}
      style={{ 
        width: '90%', 
        maxWidth: '320px', 
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-center justify-center gap-2">
        {status === 'offline' ? (
          <>
            <WifiOff size={16} />
            <span className="text-sm font-medium">You are offline</span>
          </>
        ) : status === 'slow' ? (
          <>
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Slow connection</span>
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span className="text-sm font-medium">Connected</span>
          </>
        )}
      </div>
    </div>
  );
}; 
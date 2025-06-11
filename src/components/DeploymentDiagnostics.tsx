import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
}

interface DeploymentDiagnosticsProps {
  isVisible: boolean;
  onClose: () => void;
}

export function DeploymentDiagnostics({ isVisible, onClose }: DeploymentDiagnosticsProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    results.push({
      name: 'Supabase URL',
      status: supabaseUrl ? 'success' : 'error',
      message: supabaseUrl ? 'Configured' : 'Missing VITE_SUPABASE_URL',
      details: supabaseUrl || 'Environment variable not set'
    });

    results.push({
      name: 'Supabase Anon Key',
      status: supabaseKey ? 'success' : 'error',
      message: supabaseKey ? 'Configured' : 'Missing VITE_SUPABASE_ANON_KEY',
      details: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Environment variable not set'
    });

    // Check deployment environment
    const isVercel = window.location.hostname.includes('vercel.app') || 
                    window.location.hostname.includes('.vercel.app');
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    results.push({
      name: 'Deployment Environment',
      status: 'info',
      message: isVercel ? 'Vercel' : isLocalhost ? 'Local Development' : 'Unknown',
      details: `Hostname: ${window.location.hostname}`
    });

    // Check service worker
    const swSupported = 'serviceWorker' in navigator;
    results.push({
      name: 'Service Worker Support',
      status: swSupported ? 'success' : 'warning',
      message: swSupported ? 'Supported' : 'Not supported',
      details: swSupported ? 'Browser supports service workers' : 'Service workers not available'
    });

    if (swSupported) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        results.push({
          name: 'Service Worker Registration',
          status: registration ? 'success' : 'warning',
          message: registration ? 'Active' : 'Not registered',
          details: registration ? `Scope: ${registration.scope}` : 'No active service worker'
        });
      } catch (error) {
        results.push({
          name: 'Service Worker Registration',
          status: 'error',
          message: 'Error checking registration',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check network connectivity
    try {
      const response = await fetch('/manifest.json', { method: 'HEAD' });
      results.push({
        name: 'Network Connectivity',
        status: response.ok ? 'success' : 'warning',
        message: response.ok ? 'Connected' : 'Limited connectivity',
        details: `Status: ${response.status} ${response.statusText}`
      });
    } catch (error) {
      results.push({
        name: 'Network Connectivity',
        status: 'error',
        message: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown network error'
      });
    }

    // Check Supabase connection
    if (supabaseUrl && supabaseKey) {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase.auth.getSession();
        
        results.push({
          name: 'Supabase Connection',
          status: error ? 'error' : 'success',
          message: error ? 'Connection failed' : 'Connected',
          details: error ? error.message : 'Successfully connected to Supabase'
        });
      } catch (error) {
        results.push({
          name: 'Supabase Connection',
          status: 'error',
          message: 'Import or connection error',
          details: error instanceof Error ? error.message : 'Unknown Supabase error'
        });
      }
    }

    // Check local storage
    try {
      const testKey = 'diagnostic_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      results.push({
        name: 'Local Storage',
        status: 'success',
        message: 'Available',
        details: 'Local storage is working correctly'
      });
    } catch (error) {
      results.push({
        name: 'Local Storage',
        status: 'error',
        message: 'Not available',
        details: error instanceof Error ? error.message : 'Local storage access denied'
      });
    }

    // Check console logging
    const originalLog = console.log;
    let consoleWorking = false;
    console.log = (...args) => {
      consoleWorking = true;
      originalLog(...args);
    };
    console.log('[Diagnostic] Testing console output');
    console.log = originalLog;

    results.push({
      name: 'Console Logging',
      status: consoleWorking ? 'success' : 'warning',
      message: consoleWorking ? 'Working' : 'May be disabled',
      details: consoleWorking ? 'Console.log is functional' : 'Console output may be stripped in production'
    });

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    if (isVisible) {
      runDiagnostics();
    }
  }, [isVisible]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Deployment Diagnostics</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isRunning ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Running diagnostics...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnostics.map((diagnostic, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(diagnostic.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(diagnostic.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{diagnostic.name}</h3>
                        <span className="text-sm text-gray-600">{diagnostic.message}</span>
                      </div>
                      {diagnostic.details && (
                        <p className="text-sm text-gray-600 mt-1">{diagnostic.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

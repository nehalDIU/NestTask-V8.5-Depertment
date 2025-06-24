// Simple deployment debugging script
console.log('=== NestTask Deployment Debug ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);
console.log('Local Storage:', localStorage.getItem('supabase.auth.token'));
console.log('Session Storage:', sessionStorage.getItem('supabase.auth.token'));

// Check if landing page components are available
console.log('Landing Page Available:', typeof window.LandingPage !== 'undefined');

// Check for any JavaScript errors
window.addEventListener('error', (e) => {
  console.error('JavaScript Error:', e.error);
});

// Check for unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Promise Rejection:', e.reason);
});

// Log when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  console.log('Body classes:', document.body.className);
  console.log('Root element:', document.getElementById('root'));
});

console.log('=== Debug Script Loaded ===');

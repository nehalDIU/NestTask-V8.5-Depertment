import { useState, useEffect } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { loginUser, signupUser, logoutUser, resetPassword } from '../services/auth.service';
import { forceCleanReload, updateAuthStatus } from '../utils/auth';
import type { User, LoginCredentials, SignupCredentials } from '../types/auth';

const REMEMBER_ME_KEY = 'nesttask_remember_me';
const SAVED_EMAIL_KEY = 'nesttask_saved_email';

// The function is exported directly here with 'export function' declaration
// Do not add a second export statement at the end of the file to avoid
// "Multiple exports with the same name" errors
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    if (savedEmail) {
      setSavedEmail(savedEmail);
    }
    
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      // Test connection before checking session
      const isConnected = await testConnection();
      
      // Continue even if the connection test failed - just log it
      if (!isConnected) {
        console.warn('Database connection test failed, but continuing anyway');
        // Using a warning instead of an error to reduce panic
        // Don't throw error here to avoid blocking the app
      }

      // Try to get the session regardless of connection test
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting auth session:', sessionError.message);
        return; // Just return instead of throwing
      }
      
      if (session?.user) {
        await updateUserState(session.user);
      } else {
        console.log('No active session found');
      }
    } catch (err: any) {
      console.error('Session check error:', err);
      setError('Failed to check authentication status');
      
      if (retryCount < 3) {
        const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`Will retry session check in ${timeout}ms`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkSession();
        }, timeout);
      } else {
        // After 3 retries, just set loading to false but don't call handleInvalidSession
        // This allows the app to show the login page instead of being stuck
        console.warn('Maximum retries reached for session check');
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthChange = async (_event: string, session: any) => {
    if (session?.user) {
      try {
        await updateUserState(session.user);
      } catch (err) {
        console.error('Error updating user state:', err);
        await handleInvalidSession();
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const handleInvalidSession = async () => {
    setUser(null);
    updateAuthStatus(false);
    
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('nesttask_user');
    sessionStorage.removeItem('supabase.auth.token');
    
    if (localStorage.getItem(REMEMBER_ME_KEY) !== 'true') {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
    
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear caches without page reload
    forceCleanReload();
  };

  const updateUserState = async (authUser: any) => {
    try {
      console.log('Auth user from Supabase:', authUser);
      console.log('User metadata:', authUser.user_metadata);
      console.log('Role from metadata:', authUser.user_metadata?.role);
      console.log('Auth role:', authUser.role);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      console.log('User data from database:', userData);
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        throw userError;
      }
      
      let role = userData?.role || authUser.user_metadata?.role || 'user';
      
      if (role === 'super_admin' || role === 'super-admin') {
        role = 'super-admin';
      }
      
      console.log('Final determined role:', role);
      
      if (role === 'super-admin') {
        console.log('Super admin detected, getting complete info');
        const { data: fullUserData, error: fullUserError } = await supabase
          .from('users_with_full_info')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (!fullUserError && fullUserData) {
          console.log('Full user data for super admin:', fullUserData);
          
          setUser({
            id: authUser.id,
            email: authUser.email!,
            name: fullUserData.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
            role: 'super-admin',
            createdAt: fullUserData.createdAt || authUser.created_at,
            avatar: fullUserData.avatar,
            phone: fullUserData.phone,
            studentId: fullUserData.studentId,
            departmentId: fullUserData.departmentId,
            batchId: fullUserData.batchId,
            sectionId: fullUserData.sectionId,
            departmentName: fullUserData.departmentName,
            batchName: fullUserData.batchName,
            sectionName: fullUserData.sectionName
          });
          return;
        }
      }
      
      setUser({
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || userData?.name || authUser.email?.split('@')[0] || '',
        role: role as 'user' | 'admin' | 'super-admin' | 'section_admin',
        createdAt: authUser.created_at,
        avatar: userData?.avatar,
        phone: userData?.phone || authUser.user_metadata?.phone,
        studentId: userData?.student_id || authUser.user_metadata?.studentId,
        departmentId: userData?.department_id || authUser.user_metadata?.departmentId,
        batchId: userData?.batch_id || authUser.user_metadata?.batchId,
        sectionId: userData?.section_id || authUser.user_metadata?.sectionId
      });
    } catch (err) {
      console.error('Error updating user state:', err);
      throw err;
    }
  };

  const login = async (credentials: LoginCredentials, rememberMe: boolean = false) => {
    try {
      setError(null);
      
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        localStorage.setItem(SAVED_EMAIL_KEY, credentials.email);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
      
      // Check for development mode more robustly
      const isDevelopment = import.meta.env.DEV || 
                          import.meta.env.MODE === 'development' ||
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
      
      // Try to load demo user from localStorage first (for development mode)
      if (isDevelopment && localStorage.getItem('nesttask_demo_user')) {
        try {
          const demoUser = JSON.parse(localStorage.getItem('nesttask_demo_user') || '{}');
          if (demoUser && demoUser.email === credentials.email) {
            console.log('Using cached demo user from localStorage:', demoUser);
            setUser(demoUser);
            updateAuthStatus(true);
            
            // Handle superadmin redirect for demo users too
            if (demoUser.role === 'super-admin' || demoUser.email === 'superadmin@nesttask.com') {
              console.log('Demo super admin detected');
              localStorage.setItem('is_super_admin', 'true');
              sessionStorage.setItem('is_super_admin', 'true');
              localStorage.setItem('auth_completed', 'true');
            }
            
            return demoUser;
          }
        } catch (err) {
          console.warn('Failed to parse demo user from localStorage');
        }
      }
      
      // Regular login process with the backend
      const user = await loginUser(credentials);
      console.log('User after login:', user);
      
      updateAuthStatus(true);
      
      // Check for superadmin role - use multiple conditions for robust detection
      if (
        user.role === 'super-admin' ||
        credentials.email === 'superadmin@nesttask.com' ||
        user.email === 'superadmin@nesttask.com'
      ) {
        console.log('Super admin login detected');
        
        // Ensure the role is set correctly
        user.role = 'super-admin';
        
        try {
          const { data: userData, error: userError } = await supabase
            .from('users_with_full_info')
            .select('*')
            .eq('email', user.email)
            .single();
            
          if (!userError && userData) {
            console.log('Super admin data from database:', userData);
            if (userData.name) user.name = userData.name;
          }
        } catch (err) {
          console.warn('Error fetching super admin data, using default values', err);
        }
        
        localStorage.setItem('is_super_admin', 'true');
        sessionStorage.setItem('is_super_admin', 'true');
        localStorage.setItem('auth_completed', 'true');
        
        setUser(user);
        
        return user;
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error('Error fetching user data after login:', userError);
      } else {
        console.log('User data from database after login:', userData);
        if (userData) {
          if (userData.role) {
            user.role = userData.role as 'user' | 'admin' | 'super-admin' | 'section_admin';
            console.log('Updated user role from database:', user.role);
          }
          
          if (userData.department_id) {
            user.departmentId = userData.department_id;
            console.log('Updated user department ID:', user.departmentId);
          }
          
          if (userData.batch_id) {
            user.batchId = userData.batch_id;
            console.log('Updated user batch ID:', user.batchId);
          }
          
          if (userData.section_id) {
            user.sectionId = userData.section_id;
            console.log('Updated user section ID:', user.sectionId);
          }
          
          if (userData.phone) {
            user.phone = userData.phone;
          }
          
          if (userData.student_id) {
            user.studentId = userData.student_id;
          }
          
          if (userData.avatar) {
            user.avatar = userData.avatar;
          }
        }
      }
      
      setUser(user);
      
      // Clear caches without page reload
      forceCleanReload();
      
      return user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      setError(null);
      console.log('Starting signup process with credentials:', {
        ...credentials,
        password: '[REDACTED]'
      });
      
      if (credentials.departmentId) {
        console.log(`Department selected: ${credentials.departmentId}`);
      }
      if (credentials.batchId) {
        console.log(`Batch selected: ${credentials.batchId}`);
      }
      if (credentials.sectionId) {
        console.log(`Section selected: ${credentials.sectionId}`);
      }
      
      const user = await signupUser(credentials);
      console.log('Signup successful, user data:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        batchId: user.batchId,
        sectionId: user.sectionId
      });
      
      setUser(user);
      return user;
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process in useAuth hook...');
      setError(null);
      
      setUser(null);
      
      updateAuthStatus(false);
      
      await logoutUser();
      
      console.log('Logout API call successful');
      
      if (localStorage.getItem(REMEMBER_ME_KEY) !== 'true') {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
      
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('nesttask_user');
      
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      console.log('Logout process completed');
      
      // Clear caches without page reload
      forceCleanReload();
      
      return true;
    } catch (err: any) {
      console.error('Logout error in useAuth:', err);
      setError(err.message);
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    forgotPassword,
    savedEmail,
  };
}
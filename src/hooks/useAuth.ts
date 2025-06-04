import { useState, useEffect } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { loginUser, signupUser, logoutUser, resetPassword, AuthResult } from '../services/auth.service';
import { forceCleanReload, updateAuthStatus } from '../utils/auth';
import type { User, LoginCredentials, SignupCredentials } from '../types/auth';
import { requestNotificationPermission } from '../notifications';

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
    
    await forceCleanReload();
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
        role: role as 'user' | 'admin' | 'super-admin' | 'section-admin',
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
      
      setLoading(true);
      const result = await loginUser(credentials);
      
      if (result.error) {
        console.error('Login error:', result.error);
        setError(result.error.message);
        return null;
      }
      
      if (!result.user) {
        setError('Failed to login. Please try again.');
        return null;
      }
      
      updateAuthStatus(true);
      
      // Don't automatically request notification permission
      // Let the user request it explicitly through UI interaction
      // This prevents "[Violation] Only request notification permission in response to a user gesture" warnings
      
      return result.user;
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      setError(err.message || 'An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await signupUser(credentials);
      
      if (result.error) {
        console.error('Signup error:', result.error);
        setError(result.error.message);
        return null;
      }
      
      if (!result.user) {
        setError('Failed to create account. Please try again.');
        return null;
      }
      
      updateAuthStatus(true);
      
      // Don't automatically request notification permission
      // Let the user request it explicitly through UI interaction
      // This prevents "[Violation] Only request notification permission in response to a user gesture" warnings
      
      return result.user;
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      setError(err.message || 'An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
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
      
      setTimeout(() => forceCleanReload(), 500);
      
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
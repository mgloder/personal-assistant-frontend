'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for client-side authentication
 * @returns authentication state and functions
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Check if the access token exists in cookies
    const checkAuth = () => {
      const cookies = document.cookie.split(';');
      const hasToken = cookies.some(cookie => 
        cookie.trim().startsWith('access_token=')
      );
      setIsAuthenticated(hasToken);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Log out the current user
   */
  const logout = async () => {
    try {
      // Call the logout API endpoint to clear the cookie server-side
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Also clear the cookie client-side as a fallback
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Update state and redirect
      setIsAuthenticated(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still try to redirect even if there's an error
      router.push('/login');
    }
  };

  return {
    isAuthenticated,
    isLoading,
    logout
  };
} 
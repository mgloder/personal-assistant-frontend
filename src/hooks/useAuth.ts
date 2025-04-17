'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/utils/api';

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
      const token = getAuthToken();
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Log out the current user
   */
  const logout = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        router.push('/');
        return;
      }

      // Call the logout API endpoint to blacklist the token
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      // Clear the cookie client-side
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.removeItem('access_token');
      
      // Update state and redirect to root page
      setIsAuthenticated(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still try to clear local auth state and redirect even if the server call fails
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.removeItem('access_token');
      setIsAuthenticated(false);
      router.push('/');
    }
  };

  return {
    isAuthenticated,
    isLoading,
    logout
  };
} 
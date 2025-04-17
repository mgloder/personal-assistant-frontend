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
  const logout = () => {
    // Remove the access token cookie
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setIsAuthenticated(false);
    router.push('/login');
  };

  return {
    isAuthenticated,
    isLoading,
    logout
  };
} 
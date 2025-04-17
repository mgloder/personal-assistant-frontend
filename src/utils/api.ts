/**
 * API client utility for making HTTP requests
 * Uses the native fetch API consistently across the application
 */

// Base URL for API requests
const BASE_URL = typeof window !== 'undefined' 
  ? 'http://localhost:8005'  // Client-side
  : 'http://backend:8005';   // Server-side

// Default headers for all requests
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// API endpoints
export const API = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    register: `${BASE_URL}/auth/register`,
    logout: `${BASE_URL}/auth/logout`,
  },
  chat: `${BASE_URL}/api/chat`,
  health: `${BASE_URL}/api/health`,
};

// API response types
export interface LoginResponse {
  token: string;
  success: boolean;
  message?: string;
}

export interface ChatResponse {
  message: string;
  success: boolean;
}

export interface HealthResponse {
  status: string;
  message: string;
}

/**
 * Get the authentication token from cookies or localStorage
 */
export const getAuthToken = (): string | null => {
  // First check cookies
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('access_token=')) {
      return cookie.substring('access_token='.length);
    }
  }
  
  // Then check localStorage
  return localStorage.getItem('access_token');
};

/**
 * Add authentication headers to the request
 */
const addAuthHeaders = (headers: HeadersInit): HeadersInit => {
  const token = getAuthToken();
  if (token) {
    return {
      ...headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return headers;
};

/**
 * Handle API errors
 */
const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  if (error.response) {
    return `Server error: ${error.status} - ${error.statusText}`;
  } else if (error.name === 'AbortError') {
    return 'Request timed out. Please check your connection and try again.';
  } else if (error.message?.includes('Failed to fetch')) {
    return 'Cannot connect to server. Please make sure the backend server is running.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Make a GET request
 */
export const get = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  try {
    const headers = addAuthHeaders({
      ...defaultHeaders,
      ...options.headers,
    });
    
    const response = await fetch(endpoint, {
      ...options,
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Make a POST request
 */
export const post = async <T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> => {
  try {
    const headers = addAuthHeaders({
      ...defaultHeaders,
      ...options.headers,
    });
    
    const response = await fetch(endpoint, {
      ...options,
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Make a PUT request
 */
export const put = async <T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> => {
  try {
    const headers = addAuthHeaders({
      ...defaultHeaders,
      ...options.headers,
    });
    
    const response = await fetch(endpoint, {
      ...options,
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Make a DELETE request
 */
export const del = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  try {
    const headers = addAuthHeaders({
      ...defaultHeaders,
      ...options.headers,
    });
    
    const response = await fetch(endpoint, {
      ...options,
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}; 
/**
 * WHY this file exists:
 *   Every time we call the backend API, we need to:
 *   1. Set the correct base URL
 *   2. Add the JWT token to the Authorization header
 *   3. Handle token expiry (redirect to login)
 *
 *   Doing this in every component is repetitive and error-prone.
 *   This file creates a pre-configured Axios instance that handles all of this.
 *
 * WHAT it does:
 *   - Creates an Axios HTTP client with our backend URL pre-configured
 *   - Automatically attaches the JWT token to every request
 *   - Redirects to login if the token expires (401 response)
 *
 * HOW it works:
 *   Axios "interceptors" are middleware functions that run before/after requests.
 *   - Request interceptor: runs before sending → adds Authorization header
 *   - Response interceptor: runs after receiving → handles 401 errors
 *
 *   Usage in components:
 *   import api from '@/lib/api';
 *   const response = await api.get('/api/users/me');
 *   const data = await api.post('/api/auth/login', { email, password });
 */

import axios from 'axios';

// Vite uses import.meta.env.VITE_* (not process.env.NEXT_PUBLIC_*)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minute timeout — Ollama can be slow on first response
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Runs BEFORE every HTTP request is sent
api.interceptors.request.use(
  (config) => {
    // Get the JWT token stored after login
    const token = localStorage.getItem('token');

    if (token) {
      // Attach token to every request: Authorization: Bearer eyJhbGci...
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // continue with the modified config
  },
  (error) => {
    // If there's an error building the request, reject the promise
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Runs AFTER every HTTP response is received
api.interceptors.response.use(
  (response) => {
    // Successful response (2xx) — pass it through unchanged
    return response;
  },
  (error) => {
    // Error response (4xx, 5xx)
    if (error.response?.status === 401) {
      // 401 Unauthorized — token expired or invalid
      // Clear stored auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login page
      // Using window.location instead of router because this is outside React context
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // Reject the promise so the calling code can handle the error
    return Promise.reject(error);
  }
);

export default api;

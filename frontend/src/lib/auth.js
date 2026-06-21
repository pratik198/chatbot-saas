/**
 * WHY this file exists:
 *   Authentication logic (login, logout, getting current user) is needed
 *   in many places across the app. Centralizing it here means:
 *   - One place to update if auth logic changes
 *   - Easy to import anywhere: import { login, logout, getUser } from '@/lib/auth'
 *
 * WHAT it does:
 *   - login:        calls the backend, stores token+user in localStorage
 *   - register:     calls the backend, stores token+user in localStorage
 *   - logout:       clears localStorage, redirects to login
 *   - getUser:      reads the stored user from localStorage
 *   - getToken:     reads the stored JWT token
 *   - isLoggedIn:   returns true if a token exists
 */

import api from './api';

/**
 * Login with email and password.
 * On success: stores token and user in localStorage.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - the user data from the response
 * @throws error if credentials are invalid
 */
export async function login(email, password) {
  // api.post returns: { data: ApiResponse<LoginResponse> }
  const response = await api.post('/api/auth/login', { email, password });

  const { token, ...user } = response.data.data;

  // Store token separately (used by api.js interceptor)
  localStorage.setItem('token', token);
  // Store user data for display (name, email, role)
  localStorage.setItem('user', JSON.stringify(user));

  return user;
}

/**
 * Register a new account.
 * On success: stores token and user in localStorage (auto-login after registration).
 *
 * @param {object} data - { email, password, firstName, lastName }
 * @returns {Promise<object>} - the user data
 */
export async function register(data) {
  const response = await api.post('/api/auth/register', data);

  const { token, ...user } = response.data.data;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  return user;
}

/**
 * Logout: clear all auth data and redirect to login.
 */
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

/**
 * Get the current logged-in user from localStorage.
 * Returns null if not logged in.
 *
 * @returns {object|null}
 */
export function getUser() {
  // No SSR guard needed — React (Vite) is purely client-side
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Get the JWT token from localStorage.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Check if the user is currently logged in.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getToken();
}

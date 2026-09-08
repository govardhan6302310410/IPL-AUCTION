import { create } from 'zustand';
import axios from 'axios';

const API_URL = '/api/auth';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('auction_token') || null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.post(`${API_URL}/register`, { username, email, password });
      localStorage.setItem('auction_token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('auction_token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  guestLogin: async (displayName) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.post(`${API_URL}/guest`, { displayName });
      localStorage.setItem('auction_token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Guest login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('auction_token');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) return;
    set({ isLoading: true });
    try {
      const { data } = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('auction_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const token = get().token;
    try {
      const { data } = await axios.put(`${API_URL}/profile`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ user: data.user });
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Update failed');
    }
  }
}));

export default useAuthStore;

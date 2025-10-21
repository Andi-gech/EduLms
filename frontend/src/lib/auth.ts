import { apiClient } from './apiClient';

export interface AuthState {
  token: string | null;
  role: string | null;
  name: string | null;
  id: string | null;
  department?: string | null;
  pic: string | null;
  email: string | null;
}

const STORAGE_KEY = 'edulms.auth';

let state: AuthState = { token: null, role: null, name: null, id: null, department: null, pic: null, email: null };

export function loadAuthFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
      state = parsed;
      if (state.token) apiClient.setToken(state.token);
    }
  } catch { /* ignore */ }
  return state;
}

export function saveAuth(newState: AuthState) {
  state = newState;
  if (state.token) apiClient.setToken(state.token); else apiClient.setToken(null);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearAuth() {
  state = { token: null, role: null, name: null, id: null, department: null, pic: null, email: null };
  apiClient.setToken(null);
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function getAuth() { return state; }

// Immediately hydrate
loadAuthFromStorage();

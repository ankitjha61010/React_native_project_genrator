import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { encryptText, decryptText, encryptionEnabled } from './encryption';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request: attach auth token + optionally encrypt body ──────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Encrypt outgoing JSON bodies when encryption is enabled
  if (encryptionEnabled && config.data && typeof config.data === 'object') {
    const plaintext = JSON.stringify(config.data);
    const encrypted = await encryptText(plaintext);
    config.data = { data: encrypted };
  }

  return config;
});

// ── Response: decrypt `{ data: "<base64>" }` envelopes ───────────────────────
api.interceptors.response.use(
  async (response: AxiosResponse) => {
    if (
      encryptionEnabled &&
      response.data &&
      typeof response.data === 'object' &&
      typeof response.data.data === 'string' &&
      !response.data.data.trim().startsWith('{')
    ) {
      try {
        const decrypted = await decryptText(response.data.data);
        response.data = JSON.parse(decrypted);
      } catch (err) {
        console.error('[api] Failed to decrypt response:', err);
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

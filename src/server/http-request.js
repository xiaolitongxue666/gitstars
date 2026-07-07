import axios from 'axios';
import { useUserStore } from '@/store/user';

// Self-hosted API (OAuth token exchange). Must use Vite base path when deployed under a sub-route (e.g. /gitstars/).
export const httpRequestGitstars = axios.create({
  baseURL: import.meta.env.BASE_URL,
  timeout: 15000,
});

httpRequestGitstars.interceptors.response.use((res) => res.data);

// httpRequestGithub

// GitHub API via self-hosted backend proxy (VPS mihomo → GitHub).
export const httpRequestGithub = axios.create({
  baseURL: `${import.meta.env.BASE_URL}api/github`,
  timeout: 60000,
});

httpRequestGithub.interceptors.request.use((config) => {
  const userStore = useUserStore();
  config.headers.Authorization = `Bearer ${userStore.token}`;
  return config;
});

httpRequestGithub.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // access_token 失效
    if (err.response?.status === 401) {
      localStorage.clear();
      location.reload();
    }

    return Promise.reject(err);
  },
);

import axios from 'axios';
import { clearAllAuthData, getAuthToken } from './authStorage';

let interceptorsInitialized = false;

export const setupAxiosInterceptors = (): void => {
  if (interceptorsInitialized) {
    return;
  }
  interceptorsInitialized = true;

  axios.defaults.withCredentials = true;

  axios.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const requestUrl: string = error?.config?.url || '';
      const isAuthCheckOrLogin =
        requestUrl.includes('/auth/login') || requestUrl.includes('/auth/me');

      if (status === 401 && !isAuthCheckOrLogin) {
        clearAllAuthData();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );
};

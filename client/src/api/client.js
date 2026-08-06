import axios from 'axios';
const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const api = axios.create({ baseURL, withCredentials: true });
let accessToken = sessionStorage.getItem('accessToken');
export const setAccessToken = token => { accessToken = token; if (token) sessionStorage.setItem('accessToken', token); else sessionStorage.removeItem('accessToken'); };
api.interceptors.request.use(config => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config; });
let refreshing;
api.interceptors.response.use(r => r, async error => { const original = error.config; if (error.response?.status === 401 && !original?._retry && !original?.url?.includes('/auth/')) { original._retry = true; try { refreshing ??= api.post('/auth/refresh-token'); const { data } = await refreshing; refreshing = null; setAccessToken(data.data.accessToken); original.headers.Authorization = `Bearer ${data.data.accessToken}`; return api(original); } catch (e) { refreshing = null; setAccessToken(null); window.dispatchEvent(new Event('auth:expired')); } } return Promise.reject(error); });
export const messageOf = e => e.response?.data?.error?.message || e.message || 'Something went wrong';


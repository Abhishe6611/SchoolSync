import axios from "axios";
import { addToQueue } from "./syncQueue";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sms_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem("sms_token");
        window.location.href = "/login";
      } else {
        const errorMsg = error.response.data?.detail || error.response.data?.message || "An unexpected error occurred.";
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: errorMsg, type: 'error' } }));
      }
    } else {
      const method = error.config?.method?.toLowerCase();
      // If it's a modifying request and network is down, cache it
      if (['post', 'put', 'patch', 'delete'].includes(method)) {
        // We cannot serialize FormData into IndexedDB natively via simple add without DataCloneError
        if (error.config.data instanceof FormData) {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "File uploads cannot be saved offline. Please reconnect.", type: 'error' } }));
          return Promise.reject(error);
        }

        return addToQueue({
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
        }).then(() => {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "You are offline. Action saved locally and will sync when online.", type: 'warning' } }));
          // Resolve with a mock response so the UI considers it "successful" and clears local drafts/forms
          return { data: { message: "Saved offline" }, status: 200, offline: true };
        }).catch((queueErr) => {
          console.error("Queue error:", queueErr);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Offline save failed (storage full/blocked).", type: 'error' } }));
          return Promise.reject(error);
        });
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Network error: Unable to connect to server.", type: 'error' } }));
      }
    }
    return Promise.reject(error);
  }
);

export const setToken = (token) => {
  localStorage.setItem("sms_token", token);
};

export const clearToken = () => {
  localStorage.removeItem("sms_token");
};

export const getToken = () => localStorage.getItem("sms_token");

// --- Global Transparent API Cache (SWR-like) ---
const cache = new Map();
const pendingRequests = new Map();

const originalGet = api.get;
api.get = async (url, config) => {
  const cacheKey = url + JSON.stringify(config || {});

  if (cache.has(cacheKey)) {
    const cachedRes = cache.get(cacheKey);
    
    // Background refresh if not already fetching
    if (!pendingRequests.has(cacheKey)) {
      const fetchPromise = originalGet.call(api, url, config).then(res => {
        cache.set(cacheKey, res);
        pendingRequests.delete(cacheKey);
        // Dispatch a custom event in case components want to listen to background updates
        window.dispatchEvent(new CustomEvent('api-cache-updated', { detail: { url } }));
        return res;
      }).catch(err => {
        pendingRequests.delete(cacheKey);
        throw err;
      });
      pendingRequests.set(cacheKey, fetchPromise);
    }
    
    // Deep clone the cached response data to prevent accidental mutation by components
    return Promise.resolve({ ...cachedRes, data: JSON.parse(JSON.stringify(cachedRes.data)) });
  }

  if (pendingRequests.has(cacheKey)) {
    const res = await pendingRequests.get(cacheKey);
    return { ...res, data: JSON.parse(JSON.stringify(res.data)) };
  }

  const fetchPromise = originalGet.call(api, url, config).then(res => {
    cache.set(cacheKey, res);
    pendingRequests.delete(cacheKey);
    return res;
  }).catch(err => {
    pendingRequests.delete(cacheKey);
    throw err;
  });

  pendingRequests.set(cacheKey, fetchPromise);
  const res = await fetchPromise;
  return { ...res, data: JSON.parse(JSON.stringify(res.data)) };
};

const clearCache = () => cache.clear();

['post', 'put', 'patch', 'delete'].forEach(method => {
  const original = api[method];
  api[method] = async (...args) => {
    clearCache();
    return original.apply(api, args);
  };
});

export default api;

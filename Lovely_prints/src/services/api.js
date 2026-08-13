// src/services/api.js

import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate instance for token refresh
const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// ==========================================
// ATTACH ACCESS TOKEN
// ==========================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// TOKEN REFRESH
// ==========================================

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // ==========================================
    // IMPORTANT:
    // NETWORK ERROR
    // ==========================================
    //
    // If there is no response, the server could
    // not be reached.
    //
    // DO NOT:
    // - logout
    // - redirect
    // - clear localStorage
    // - create a new session
    //
    if (!error.response) {
      return Promise.reject(error);
    }

    // ==========================================
    // ONLY 401 CAN TRIGGER TOKEN REFRESH
    // ==========================================

    if (status !== 401) {
      return Promise.reject(error);
    }

    // Prevent infinite retry
    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // ==========================================
    // IF ANOTHER REQUEST IS ALREADY REFRESHING
    // ==========================================

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
        });
      }).then((token) => {
        originalRequest.headers.Authorization =
          `Bearer ${token}`;

        return api(originalRequest);
      });
    }

    isRefreshing = true;

    const refreshToken =
      localStorage.getItem("refresh_token");

    // ==========================================
    // NO REFRESH TOKEN
    // ==========================================

    if (!refreshToken) {
      processQueue(error, null);

      // IMPORTANT:
      // Do NOT clear the entire localStorage.
      //
      // This preserves:
      // docuvio_active_print_session
      //
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      isRefreshing = false;

      return Promise.reject(error);
    }

    // ==========================================
    // REFRESH TOKEN
    // ==========================================

    try {
      const res = await refreshApi.post(
        "/auth/refresh",
        {
          refresh_token: refreshToken,
        }
      );

      const newAccessToken =
        res.data.data.access_token;

      const newRefreshToken =
        res.data.data.refresh_token;

      localStorage.setItem(
        "access_token",
        newAccessToken
      );

      localStorage.setItem(
        "refresh_token",
        newRefreshToken
      );

      supabase.realtime.setAuth(
        newAccessToken
      );

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // IMPORTANT:
      // Do NOT localStorage.clear()
      //
      // Do NOT destroy the Docuvio print session.
      //
      // Also don't force a login redirect here.
      //
      // Let the calling page decide what to do.
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
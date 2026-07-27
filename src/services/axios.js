import axios from "axios";
import { API_BASE_URL } from "../config/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Chat, user, and status endpoints are protected by the server's auth
// middleware.  Keep the Bearer token on this client just as we do for the
// other axios instance, so requests work even when cross-site cookies are
// unavailable.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;

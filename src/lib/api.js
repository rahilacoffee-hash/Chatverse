import axios from "axios";
import { API_ORIGIN } from "../config/api";

const api = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
});

// Attaches the access token as a Bearer header on every request.
// withCredentials already sends your httpOnly accessToken cookie too,
// so this covers your auth middleware whether it reads from the cookie
// or from the Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

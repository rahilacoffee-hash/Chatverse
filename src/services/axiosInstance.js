import axios from "axios";
import { API_BASE_URL } from "../config/api";

const axiosInstance = axios.create({
 baseURL: API_BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }


  return config;
});

export default axiosInstance;

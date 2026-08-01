import axios from "axios";
import { API_BASE_URL } from "../config/api";

const API = axios.create({
 baseURL: API_BASE_URL,
  withCredentials: true,
});

// Register
export const registerUser = (data) => API.post("/user/register", data);

// Verify Email
export const verifyEmail = (data) => API.post("/user/verifyEmail", data);

// Login
export const loginUser = (data) => API.post("/user/login", data);

// Logout
export const logoutUser = (token) =>
  API.get("/user/logout", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// User Details
export const getUserDetails = (token) =>
  API.get("/user/user-details", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const getMyConnections = (token) =>
  API.get("/user/connections", { headers: { Authorization: `Bearer ${token}` } });

export const followUser = (userId) => API.post(`/user/${userId}/follow`);
export const unfollowUser = (userId) => API.delete(`/user/${userId}/follow`);

// Update Profile
export const updateUser = (data, token) =>
  API.put("/user/update", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// Forgot Password
export const forgotPassword = (data) => API.post("/user/forgot-password", data);

// Verify Forgot Password OTP
export const verifyForgotPasswordOtp = (data) =>
  API.post("/user/verify-forgot-password-otp", data);

// Reset Password
export const resetPassword = (data) => API.post("/user/reset-password", data);

// Refresh Token
export const refreshToken = () => API.post("/user/refresh-token");

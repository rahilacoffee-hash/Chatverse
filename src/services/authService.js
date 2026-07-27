import axios from "axios";

const API = axios.create({
 baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true,
});

// Register
export const registerUser = (data) => API.post("/register", data);

// Verify Email
export const verifyEmail = (data) => API.post("/verifyEmail", data);

// Login
export const loginUser = (data) => API.post("/login", data);

// Logout
export const logoutUser = (token) =>
  API.get("/logout", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// User Details
export const getUserDetails = (token) =>
  API.get("/user-details", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// Update Profile
export const updateUser = (data, token) =>
  API.put("/update", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// Forgot Password
export const forgotPassword = (data) => API.post("/forgot-password", data);

// Verify Forgot Password OTP
export const verifyForgotPasswordOtp = (data) =>
  API.post("/verify-forgot-password-otp", data);

// Reset Password
export const resetPassword = (data) => API.post("/reset-password", data);

// Refresh Token
export const refreshToken = () => API.post("/refresh-token");

import api from "./axios";

export const getAdminOverview = async () => (await api.get("/admin/overview")).data.data;
export const getAdminUsers = async (params) => (await api.get("/admin/users", { params })).data.data;
export const getAdminPosts = async (params) => (await api.get("/admin/posts", { params })).data.data;
export const setUserVerification = async (userId, verified) => (await api.patch(`/admin/users/${userId}/verification`, { verified })).data.data;
export const setUserStatus = async (userId, status) => (await api.patch(`/admin/users/${userId}/status`, { status })).data.data;
export const removeAdminPost = async (postId) => (await api.delete(`/admin/posts/${postId}`)).data.data;

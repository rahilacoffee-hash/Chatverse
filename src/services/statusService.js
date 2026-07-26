import axiosInstance from "./axiosInstance";

export const getStatuses = () => axiosInstance.get("/status");
export const getMyStatuses = () => axiosInstance.get("/status/mine");
export const createStatus = (data) => axiosInstance.post("/status", data);
export const markStatusViewed = (id) => axiosInstance.patch(`/status/${id}/view`);
export const deleteStatus = (id) => axiosInstance.delete(`/status/${id}`);

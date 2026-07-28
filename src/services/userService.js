import api from "../services/axios";
import axiosInstance from "./axiosInstance";

export const getCurrentUser = async () => {
  const res = await api.get(
    "/user/user-details"
  );

  return res.data.data;
};

export const searchUsers = async (search) => {
  const res = await axiosInstance.get(
    `/user/search?search=${search}`
  );

  return res.data.data;
};

export const getPublicUser = async (userId) => {
  const res = await axiosInstance.get(`/user/${userId}`);
  return res.data.data;
};

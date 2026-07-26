import { create } from "zustand";
import { getCurrentUser } from "../services/userService";

const useAuthStore = create((set) => ({
  user: null,
  loading: false,

  fetchUser: async () => {
    try {
      set({ loading: true });

      const user = await getCurrentUser();

      set({
        user,
        loading: false,
      });
    } catch {
      set({
        loading: false,
      });
    }
  },
}));

export default useAuthStore;
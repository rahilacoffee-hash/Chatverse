// Keep HTTP and Socket.IO pointed at the same deployment.  `VITE_API_URL`
// remains available for staging or local development, while production has a
// working default even when the environment variable was not configured.
const fallbackApiUrl = "https://server-my3u.onrender.com";

export const API_ORIGIN = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(
  /\/+$/,
  "",
);

export const API_BASE_URL = `${API_ORIGIN}/api`;

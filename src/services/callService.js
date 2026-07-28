import api from "./axios";

let cachedConfiguration = null;
let configurationExpiresAt = 0;

export const getIceConfiguration = async () => {
  if (cachedConfiguration && Date.now() < configurationExpiresAt) {
    return cachedConfiguration;
  }

  const response = await api.get("/call/ice-servers");
  cachedConfiguration = response.data.data;
  // TURN credentials are valid for at least one minute. Refresh well before
  // their normal one-hour expiry without making every call setup wait twice.
  configurationExpiresAt = Date.now() + 45 * 60 * 1000;
  return cachedConfiguration;
};

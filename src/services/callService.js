import api from "./axios";

let cachedConfiguration = null;
let configurationExpiresAt = 0;

export const getIceConfiguration = async () => {
  if (cachedConfiguration && Date.now() < configurationExpiresAt) {
    return cachedConfiguration;
  }

  // Mobile networks can leave a cross-origin request pending for a long time
  // (for example while a sleeping API instance wakes). Do not leave the call
  // UI stuck at "starting" forever: the caller can still begin ICE gathering
  // with the component's STUN fallback.
  const response = await api.get("/call/ice-servers", { timeout: 8000 });
  cachedConfiguration = response.data.data;
  // TURN credentials are valid for at least one minute. Refresh well before
  // their normal one-hour expiry without making every call setup wait twice.
  configurationExpiresAt = Date.now() + 45 * 60 * 1000;
  return cachedConfiguration;
};

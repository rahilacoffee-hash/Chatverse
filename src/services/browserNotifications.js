const SERVICE_WORKER_URL = `${import.meta.env.BASE_URL}notification-sw.js`;

const supportsNotifications = () =>
  typeof window !== "undefined" && "Notification" in window;

export const requestNotificationPermission = async () => {
  if (!supportsNotifications()) return undefined;
  if (Notification.permission !== "default") return Notification.permission;

  return Notification.requestPermission();
};

const getRegistration = async () => {
  if (!("serviceWorker" in navigator)) return undefined;

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  } catch (error) {
    console.warn("Unable to register the notification service worker.", error);
    return undefined;
  }
};

export const showBrowserNotification = async (title, options = {}) => {
  if (!supportsNotifications() || Notification.permission !== "granted") {
    return false;
  }

  const registration = await getRegistration();
  if (!registration) return false;

  try {
    await registration.showNotification(title, options);
    return true;
  } catch (error) {
    console.warn("Unable to show notification.", error);
    return false;
  }
};

export const closeBrowserNotifications = async (tag) => {
  const registration = await getRegistration();
  if (!registration) return;

  try {
    const notifications = await registration.getNotifications(tag ? { tag } : undefined);
    notifications.forEach((notification) => notification.close());
  } catch (error) {
    console.warn("Unable to close notifications.", error);
  }
};

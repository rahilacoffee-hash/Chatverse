let audioContext;
let ringInterval;
import {
  closeBrowserNotifications,
  showBrowserNotification,
} from "./browserNotifications";

const INCOMING_CALL_NOTIFICATION_TAG = "chatverse-incoming-call";

const playTone = (context, frequency, startAt, duration) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

const ringOnce = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  audioContext ||= new AudioContext();
  audioContext.resume().catch(() => {});
  const startAt = audioContext.currentTime + 0.02;
  playTone(audioContext, 480, startAt, 0.32);
  playTone(audioContext, 620, startAt + 0.38, 0.32);
};

const showCallNotification = async (callerName, callType) => {
  await closeBrowserNotifications(INCOMING_CALL_NOTIFICATION_TAG);
  await showBrowserNotification(`Incoming ${callType} call`, {
    body: `${callerName} is calling you on ChatVerse`,
    tag: INCOMING_CALL_NOTIFICATION_TAG,
    renotify: true,
    requireInteraction: true,
    silent: true,
    data: { url: window.location.href },
  });
};

export const startIncomingCallAlert = (callerName, callType) => {
  stopIncomingCallAlert();
  ringOnce();
  ringInterval = window.setInterval(ringOnce, 3200);
  // Chrome blocks vibration from a socket-driven incoming call until the
  // document has received a user gesture. Skipping it in that case avoids a
  // noisy intervention warning; the visual call screen and ringtone remain.
  if (navigator.userActivation?.hasBeenActive) {
    navigator.vibrate?.([300, 150, 300, 1800]);
  }
  void showCallNotification(callerName, callType);
};

export const stopIncomingCallAlert = () => {
  if (ringInterval) window.clearInterval(ringInterval);
  ringInterval = undefined;
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(0);
  void closeBrowserNotifications(INCOMING_CALL_NOTIFICATION_TAG);
};

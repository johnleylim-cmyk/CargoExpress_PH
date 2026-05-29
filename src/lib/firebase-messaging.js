// Firebase Cloud Messaging — Push Notifications
// Handles FCM token registration and foreground message listening
// Works on Firebase Free (Spark) plan — FCM is free & unlimited

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from './firebase';
import { supabase } from './supabase';

/**
 * Request notification permission and register FCM token
 * @param {string} userId - Supabase user ID to save the token against
 * @returns {string|null} - FCM token or null if permission denied
 */
export const requestNotificationPermission = async (userId) => {
  // Check browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  // Don't re-ask if already denied
  if (Notification.permission === 'denied') {
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Firebase app must be initialized
    if (!app) {
      return null;
    }

    const messaging = getMessaging(app);

    // Register service worker for FCM
    const swRegistration = await navigator.serviceWorker.getRegistration('/sw.js');

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration || undefined,
    });

    if (!token) {
      return null;
    }

    // Save token to user's profile in Supabase
    await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', userId);

    return token;
  } catch (err) {
    return null;
  }
};

/**
 * Listen for foreground messages (when app is open)
 * Shows a toast/in-app notification instead of system notification
 * @param {function} callback - Called with message payload
 * @returns {function} unsubscribe function
 */
export const onForegroundMessage = (callback) => {
  if (!app) return () => {};
  
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch (err) {
    return () => {};
  }
};

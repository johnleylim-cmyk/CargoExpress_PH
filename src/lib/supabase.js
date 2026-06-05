import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CONFIGURATION
// Reads from .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase env variables. Check your .env file.');
}

// ---------------------------------------------------------------------------
// FIX: The previous config had `lock: 'no-op'` (a string).
// The Supabase auth client expects `lock` to be an async FUNCTION, not a string.
// Passing a string caused: TypeError: this.lock is not a function
// whenever any auth operation (login, getSession, signOut, updateProfile) ran.
//
// The correct no-op lock is an async function that simply calls the callback:
//   async (name, acquireTimeout, fn) => fn()
//
// This disables cross-tab navigator.locks coordination (safe for single-tab apps)
// and prevents NavigatorLockAcquireTimeoutError in environments without
// navigator.locks support (e.g. some Android browsers, iframes, etc.)
// ---------------------------------------------------------------------------
const noOpLock = async (_name, _acquireTimeout, fn) => fn();

// ---------------------------------------------------------------------------
// FETCH WRAPPER (Timeout & Retries)
// ---------------------------------------------------------------------------
const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 1000) => {
  const timeoutMs = 45000; // 45 seconds timeout
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    
    // If it's a 5xx error or 429 Too Many Requests, throw to trigger a retry
    if (!response.ok && (response.status >= 500 || response.status === 429)) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      // Retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoff));
      // Exponential backoff: 1s, 2s, 4s
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    // No more retries, throw the error so the UI can catch it
    throw error;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Use the proper no-op lock function (NOT the string 'no-op')
    lock: noOpLock,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL (for OAuth/magic link redirects)
    detectSessionInUrl: true,
    // Auto-refresh the token before it expires
    autoRefreshToken: true,
  },
  global: {
    fetch: fetchWithRetry,
  },
  realtime: {
    reconnectAfterMs: (tries) => Math.min(tries * 2000 + 1000, 15000),
  },
});

export default supabase;

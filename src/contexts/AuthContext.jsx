import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile, createProfile } from '../lib/database';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Flag to prevent onAuthStateChange from fetching profile during registration.
  // When registering, signUp() fires SIGNED_IN immediately (email confirmation disabled),
  // but the profile row doesn't exist yet — causing fetchProfile() to fail and set a
  // placeholder with empty data. The register() function handles createProfile + fetchProfile itself.
  const isRegistering = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          if (isMounted) setLoading(false);
          return;
        }

        if (session?.user) {
          if (isMounted) setUser(session.user);
          await fetchProfile(session.user.id, isMounted);
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          // Only re-fetch the profile on an actual sign-in.
          // TOKEN_REFRESHED fires automatically every ~55 minutes (Supabase
          // auto-refresh) and does NOT change the profile — fetching it again
          // on every token refresh causes unnecessary DB load and, if the fetch
          // is slow, can accidentally trigger the signOut() fallback below,
          // creating an auth loop (SIGNED_IN → slow profile → SIGNED_OUT → loop).
          //
          // SKIP during registration — register() will handle createProfile + fetchProfile
          // after the profile row is actually inserted. Without this guard, fetchProfile()
          // runs before the profile exists and sets a placeholder with empty data.
          if (event === 'SIGNED_IN' && !isRegistering.current) {
            await fetchProfile(session.user.id, isMounted);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * fetchProfile — always reads from the `profiles` table (Single Source of Truth).
   * The name shown in the UI comes from profiles.name, NOT from Supabase Auth metadata.
   *
   * Fallback behaviour: if the profile row doesn't exist yet (e.g. mid-registration),
   * we set a minimal placeholder so the app never hangs.
   * The placeholder name is intentionally left empty — UI components should handle
   * the empty-string case gracefully (e.g. showing the email instead).
   */
  const fetchProfile = async (userId, isMounted = true) => {
    try {
      const profile = await getProfile(userId);
      if (isMounted) {
        setUserProfile(profile);
        setLoading(false);
      }
    } catch (error) {
      if (isMounted) {
        // Use a minimal placeholder profile so the app never hangs or force-logs
        // the user out due to a slow/failed DB call. A missing profile row is
        // unlikely in production; if it genuinely doesn't exist the user will
        // land on a limited UI and can retry. Calling signOut() here would
        // create a redirect loop on slow connections.
        setUserProfile({ id: userId, role: null, name: '', email: '' });
        setLoading(false);
      }
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Await profile strictly so it doesn't navigate back to login due to empty profile
      await fetchProfile(data.user.id);
      return { success: true, user: data.user };
    } catch (error) {
      setLoading(false);
      let msg = error.message || 'An unexpected error occurred.';
      // Map Supabase generic error to user-friendly messages
      if (msg.toLowerCase().includes('invalid login credentials') ||
          msg.toLowerCase().includes('invalid login')) {
        msg = 'Incorrect password or no account found with this email.';
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Your email is not confirmed. Please check your inbox.';
      } else if (msg.toLowerCase().includes('rate limit') ||
                 msg.toLowerCase().includes('too many')) {
        msg = 'Too many failed attempts. Please wait a few minutes and try again.';
      }
      return { success: false, error: msg };
    }
  };

  const register = async (email, password, profileData) => {
    try {
      setLoading(true);

      // Set flag BEFORE signUp so onAuthStateChange skips the premature fetchProfile.
      isRegistering.current = true;

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      const combinedAddress = [
        profileData.address_lot_block,
        profileData.address_street,
        profileData.address_barangay,
        profileData.address_city,
        profileData.address_province
      ].filter(Boolean).join(', ');

      await createProfile({
        id: data.user.id,
        email,
        name: profileData.name,
        facebook_name: profileData.facebook_name || null,
        phone: profileData.phone || null,
        role: 'customer',
        address: combinedAddress || null,
        address_lot_block: profileData.address_lot_block || null,
        address_street: profileData.address_street || null,
        address_barangay: profileData.address_barangay || null,
        address_city: profileData.address_city || null,
        address_province: profileData.address_province || null,
      });

      // Profile row now exists — safe to fetch
      await fetchProfile(data.user.id);

      // Clear flag so future sign-ins work normally
      isRegistering.current = false;

      return { success: true, user: data.user };
    } catch (error) {
      isRegistering.current = false;
      setLoading(false);
      let msg = error.message;
      if (msg.includes('already registered')) {
        msg = 'This email is already registered. Please sign in instead.';
      }
      return { success: false, error: msg };
    }
  };

  const logout = useCallback(async () => {
    // Clear local state immediately so user is logged out even if offline
    setUser(null);
    setUserProfile(null);
    setLoading(false);

    // Remove only auth-related storage keys (preserve PWA cache, user preferences, drafts)
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k === 'supabase.auth.token')
        .forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('fcm_asked');
    } catch (e) {
      // Storage access can fail in some browsers (e.g. incognito Safari)
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Silently handle sign out errors — local state is already cleared
    }
    
    return { success: true };
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const changePassword = useCallback(async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * refreshProfile — re-fetches the profiles row from Supabase and updates context state.
   * Call this after any profile save to keep the UI in sync without a full page reload.
   */
  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user]);

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAdmin: userProfile?.role === 'admin',
    isCustomer: userProfile?.role === 'customer',
    login,
    register,
    logout,
    resetPassword,
    changePassword,
    refreshProfile,
  }), [user, userProfile, loading, logout, resetPassword, changePassword, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import { fetchProfile, logAudit } from '../lib/uabsenApi';

export const AuthContext = createContext(null);

const SIGN_OUT_TIMEOUT_MS = 5000;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 5000;
const PROFILE_LOAD_TIMEOUT_MS = 7000;

async function withTimeout(promise, timeoutMs, fallbackMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new Error(fallbackMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

/** Hapus kunci sesi Supabase dari localStorage secara paksa. */
function clearSupabaseLocalSession() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* SSR / localStorage not available */
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = masih inisialisasi
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const mountedRef = useRef(true);

  // Ambil profil dari DB; tidak melempar error, hanya log
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser?.id) {
      if (mountedRef.current) setProfile(null);
      return;
    }

    try {
      const result = await fetchProfile(authUser);
      if (mountedRef.current) {
        setProfile(result);
      }
    } catch (err) {
      console.error('Gagal memuat profil:', err);
      // Jangan set null — biarkan profile lama agar tidak flash redirect
    }
  }, []);

  const loadProfileSafely = useCallback(
    async (authUser) => {
      try {
        await withTimeout(
          loadProfile(authUser),
          PROFILE_LOAD_TIMEOUT_MS,
          'Load profile user terlalu lama dan dibatalkan.',
        );
      } catch (err) {
        console.error('Gagal memuat profil user:', err);
      }
    },
    [loadProfile],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!hasSupabaseEnv || !supabase) {
      setLoading(false);
      return;
    }

    // onAuthStateChange adalah source-of-truth utama untuk session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mountedRef.current) return;

      setSession(nextSession);

      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        setProfile(null);
        setSigningOut(false);
        setLoading(false);
        return;
      }

      // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, dll
      await loadProfileSafely(nextSession.user);

      if (event === 'SIGNED_IN') {
        // Audit log fire-and-forget
        logAudit('login', 'Pengguna berhasil masuk ke sistem.').catch(() => {});
      }

      if (mountedRef.current) {
        setLoading(false);
      }
    });

    async function bootstrapAuth() {
      try {
        const {
          data: { user },
        } = await withTimeout(
          supabase.auth.getUser(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          'Supabase getUser saat bootstrap auth tidak merespons.',
        );

        if (!mountedRef.current) return;

        if (!user) {
          setSession(null);
          setProfile(null);
          return;
        }

        setSession((currentSession) => currentSession ?? { user });
        await loadProfileSafely(user);
      } catch (err) {
        console.error('Auth bootstrap error:', err);
        if (mountedRef.current) {
          setSession(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfileSafely]);

  const value = useMemo(
    () => ({
      session,
      profile,
      // loading = true hanya ketika session masih undefined (inisialisasi pertama)
      loading,

      signIn: async (email, password) => {
        if (!supabase) throw new Error('Konfigurasi Supabase belum diisi pada file .env.');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },

      signOut: async () => {
        if (!supabase) return;

        setSigningOut(true);
        logAudit('logout', 'Pengguna keluar dari sistem.').catch(() => {});

        // Timeout 5 detik — jika Supabase tidak merespons, paksa clear lokal
        let timerId;
        const timeoutPromise = new Promise((resolve) => {
          timerId = setTimeout(() => {
            console.warn('signOut timeout — paksa clear sesi lokal.');
            clearSupabaseLocalSession();
            if (mountedRef.current) {
              setSession(null);
              setProfile(null);
              setSigningOut(false);
            }
            resolve();
          }, SIGN_OUT_TIMEOUT_MS);
        });

        await Promise.race([supabase.auth.signOut(), timeoutPromise]);
        clearTimeout(timerId);
      },

      signingOut,

      refreshProfile: async () => {
        if (!supabase || !session?.user) return;
        await loadProfile(session.user);
      },
    }),
    [loading, profile, session, signingOut, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

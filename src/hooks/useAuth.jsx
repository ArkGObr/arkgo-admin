import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // Safety net: in some browsers/scenarios, Supabase auth lock gets stuck on hard refresh
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 1500);

    // Enforce "Keep me signed in" policy
    const remembered = localStorage.getItem('arkgo_remember_me') === 'true';
    const hasActiveSession = sessionStorage.getItem('arkgo_session_active') === 'true';
    
    if (!remembered && !hasActiveSession) {
      // Tab was closed and "Remember me" wasn't checked. End session locally.
      supabase.auth.signOut().finally(() => {
        if (isMounted) setLoading(false);
      });
      clearTimeout(safetyTimeout);
      // We do NOT return here, otherwise we skip initializing the onAuthStateChange listener needed for login!
    } else {
      // Tag this tab as active
      sessionStorage.setItem('arkgo_session_active', 'true');

      // Check existing session only if we are allowed to keep it
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          clearTimeout(safetyTimeout);
          if (!isMounted) return;
          if (session?.user) {
            setUser(session.user);
            fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        })
        .catch((err) => {
          clearTimeout(safetyTimeout);
          console.error('Session error:', err);
          if (isMounted) setLoading(false);
        });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      if (data?.role !== 'admin') {
        // Not an admin — sign out
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password, rememberMe = false) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    if (rememberMe) {
      localStorage.setItem('arkgo_remember_me', 'true');
    } else {
      localStorage.removeItem('arkgo_remember_me');
    }
    sessionStorage.setItem('arkgo_session_active', 'true');
    
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('arkgo_remember_me');
    sessionStorage.removeItem('arkgo_session_active');
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  sessionLoading: boolean;
  refreshSession: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

type SupabaseProviderProps = {
  children: React.ReactNode;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function SupabaseProvider({ children, supabaseUrl, supabaseAnonKey }: SupabaseProviderProps) {
  const [supabase] = useState(() => {
    return createClient(supabaseUrl, supabaseAnonKey);
  });
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setSessionLoading(true);
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session ?? null);
        setSessionLoading(false);
      }
    };

    bootstrap().catch(() => setSessionLoading(false));

    const {
      data: authListener
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription?.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      supabase,
      session,
      sessionLoading,
      refreshSession
    }),
    [refreshSession, session, sessionLoading, supabase]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabaseClient() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabaseClient must be used within SupabaseProvider");
  }

  return context.supabase;
}

export function useSupabaseSession() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabaseSession must be used within SupabaseProvider");
  }

  return {
    session: context.session,
    sessionLoading: context.sessionLoading,
    refreshSession: context.refreshSession
  };
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = new Set(["afhaigh76@gmail.com", "25120759@sunwayeducation.info"]);

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true, isAdmin: false, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const resolveAdmin = (u: User | null) => {
      if (!u) { setIsAdmin(false); return; }
      // hardcoded owner emails always treated as admin (so the nav shows the admin pill
      // even before/while user_roles propagation completes)
      if (u.email && ADMIN_EMAILS.has(u.email.toLowerCase())) { setIsAdmin(true); return; }
      setTimeout(async () => {
        const { data } = await supabase
          .from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle();
        setIsAdmin(!!data);
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s); setUser(s?.user ?? null); resolveAdmin(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setUser(data.session?.user ?? null);
      resolveAdmin(data.session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user, session, loading, isAdmin,
      signOut: async () => {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") window.location.href = "/landing";
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() { return useContext(Ctx); }

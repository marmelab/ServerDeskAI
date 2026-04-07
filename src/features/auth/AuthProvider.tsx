import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "./services/auth";
import { useProfile } from "./hooks/useProfile";
import type { Profile } from "@/lib/types";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((session) => {
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setLoading(false);
      });

    const { unsubscribe } = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return unsubscribe;
  }, []);

  const user = session?.user ?? null;
  const { data: profile } = useProfile(user?.id);

  return (
    <AuthContext.Provider value={{ user, profile: profile ?? null, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

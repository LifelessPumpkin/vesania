'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export interface DbUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  profileComplete: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  dbUser: DbUser | null;
  profileComplete: boolean;
  getToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  dbUser: null,
  profileComplete: true,
  getToken: async () => null,
  refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [profileComplete, setProfileComplete] = useState(true);

  const syncUser = async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      const syncedUser = data.user as DbUser | undefined;
      setRole(syncedUser?.role || 'USER');
      setDbUser(syncedUser || null);
      setProfileComplete(syncedUser?.profileComplete ?? true);
    } catch (err) {
      console.error("Failed to sync user:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await syncUser(currentUser);
      } else {
        setRole(null);
        setDbUser(null);
        setProfileComplete(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  const refreshProfile = async () => {
    if (!user) return;
    await syncUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, dbUser, profileComplete, getToken, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  ticketCode: string | null;
  loading: boolean;
  authError: string | null;
  loginAsAdmin: (password: string) => Promise<boolean>;
  loginWithTicket: (code: string) => Promise<boolean>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isAdmin: false, 
  ticketCode: null,
  loading: true,
  authError: null,
  loginAsAdmin: async () => false,
  loginWithTicket: async () => false,
  clearSession: () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthError(null);
        // Check if admin
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
        setLoading(false);
      } else {
        // Auto sign-in anonymously if no user
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous auth error:", error);
          if (error.code === 'auth/network-request-failed') {
            setAuthError("Network error: Please disable ad-blockers/Brave shields or check your connection.");
          } else {
            setAuthError(error.message);
          }
          setLoading(false);
        });
      }
    });

    return unsubscribe;
  }, []);

  const loginAsAdmin = async (password: string) => {
    if (password === 'ADMIN2026' && user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
        setIsAdmin(true);
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }
    return false;
  };

  const loginWithTicket = async (code: string) => {
    if (!user) return false;
    try {
      const ticketDoc = await getDoc(doc(db, 'tickets', code));
      if (ticketDoc.exists()) {
        setTicketCode(code);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const clearSession = async () => {
    setIsAdmin(false);
    setTicketCode(null);
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, ticketCode, loading, authError, loginAsAdmin, loginWithTicket, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

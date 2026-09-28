import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

/**
 * Holds the signed-in account for both roles. Users and NGOs share one cookie
 * and one JWT, so a single context covers both and `role` decides which
 * dashboard the router should allow.
 */
export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null);
  // `checking` is true until the initial "am I signed in?" call resolves, which
  // stops protected routes from flashing the login page on a hard refresh.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await api.auth.me();
        if (active) {
          setAccount(data.account);
          setRole(data.role);
        }
      } catch {
        // 401 simply means nobody is signed in.
      } finally {
        if (active) setChecking(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.auth.login(credentials);
    setAccount(data.user);
    setRole('user');
    return data.user;
  }, []);

  const loginNgo = useCallback(async (credentials) => {
    const { data } = await api.ngo.login(credentials);
    setAccount(data.ngo);
    setRole('ngo');
    return data.ngo;
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await api.auth.register(details);
    setAccount(data.user);
    setRole('user');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setAccount(null);
      setRole(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      account,
      role,
      checking,
      isAuthenticated: Boolean(account),
      isUser: role === 'user',
      isNgo: role === 'ngo',
      login,
      loginNgo,
      register,
      logout,
    }),
    [account, role, checking, login, loginNgo, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}

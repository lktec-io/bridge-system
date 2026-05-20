import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bis_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('bis_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authAPI.getProfile();
      setUser(data);
      localStorage.setItem('bis_user', JSON.stringify(data));
    } catch {
      localStorage.removeItem('bis_token');
      localStorage.removeItem('bis_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { token, ...userInfo } = data;
    localStorage.setItem('bis_token', token);
    localStorage.setItem('bis_user', JSON.stringify(userInfo));
    setUser(userInfo);
    return data;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    const { token, ...userInfo } = data;
    localStorage.setItem('bis_token', token);
    localStorage.setItem('bis_user', JSON.stringify(userInfo));
    setUser(userInfo);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('bis_token');
    localStorage.removeItem('bis_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

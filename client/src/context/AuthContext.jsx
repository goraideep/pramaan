// Holds the logged-in user + token in React state (and localStorage so a
// page refresh doesn't log the user out). Any component can call
// useAuth() to read the current user or call login()/logout().
import React, { createContext, useContext, useState } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pramaan_user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('pramaan_token', res.data.token);
    localStorage.setItem('pramaan_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('pramaan_token');
    localStorage.removeItem('pramaan_user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

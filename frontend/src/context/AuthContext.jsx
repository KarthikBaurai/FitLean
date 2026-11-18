import { createContext, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from '../api';

// Who is logged in, shared with every component.
//   const { user, login, register, logout } = useAuth();
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // checking a saved token on page load

  // On page load: if a token was saved, ask the API who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setChecking(false);
      return;
    }
    api('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  }

  async function register(details) {
    const { token, user } = await api('/auth/register', { method: 'POST', body: details });
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

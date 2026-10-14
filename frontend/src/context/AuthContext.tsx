import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  login: (username: string, password: string) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const savedToken = getAuthToken();
      if (savedToken) {
        try {
          const profile = await api.getMyProfile();
          setUser(profile);
          setTokenState(savedToken);
        } catch {
          removeAuthToken();
          setUser(null);
          setTokenState(null);
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  const login = async (username: string, password: string): Promise<UserRole> => {
    const res = await api.login({ username, password });
    setAuthToken(res.access_token);
    setTokenState(res.access_token);
    const userObj: User = {
      id: res.user_id,
      username: res.username,
      role: res.role,
      full_name: res.full_name,
      is_active: true,
    };
    setUser(userObj);
    return res.role;
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setTokenState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        role: user?.role || null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

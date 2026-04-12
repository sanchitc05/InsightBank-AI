import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, refreshSession, setLogoutHandler } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  // Initialize session from cookie on mount
  useEffect(() => {
    // Register logout handler with API service
    setLogoutHandler(logout);

    const initAuth = async () => {
      try {
        await refreshSession();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [logout]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await loginUser(credentials);
      setIsAuthenticated(true);
      // Backend should return user info in response body, cookies are handled by browser
      setUser(response.user || { email: credentials.email }); 
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const response = await registerUser(userData);
      setIsAuthenticated(true);
      setUser(response.user || { email: userData.email });
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

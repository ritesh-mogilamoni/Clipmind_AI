import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("clipmind_token"));
  const [loading, setLoading] = useState(true);

  // Fetch current user details on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Failed to load user:", error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem("clipmind_token", data.access_token);
    setToken(data.access_token);
    const userData = await authApi.getCurrentUser();
    setUser(userData);
    return userData;
  };

  const signup = async (userData) => {
    const newUser = await authApi.signup(userData);
    // After signup, automatically log in the user
    await login(userData.email, userData.password);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem("clipmind_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

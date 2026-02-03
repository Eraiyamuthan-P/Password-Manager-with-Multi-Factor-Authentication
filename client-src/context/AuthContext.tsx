import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User } from '../utils/api';
import CryptoService from '../utils/crypto';

interface AuthContextType {
  user: User | null;
  token: string | null;
  vaultKey: CryptoKey | null;
  login: (email: string, masterPassword: string, twoFactorToken?: string) => Promise<void>;
  register: (email: string, masterPassword: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (email: string, masterPassword: string) => {
    try {
      // Generate salt
      const salt = CryptoService.generateSalt();

      // Derive vault key from master password
      const vaultKey = await CryptoService.deriveMasterKey(masterPassword, salt);

      // Export vault key to encrypt it
      const exportedKey = await crypto.subtle.exportKey('raw', vaultKey);
      const keyString = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

      // Encrypt vault key with master password for storage
      const encryptedVaultKey = await CryptoService.encrypt(keyString, vaultKey);

      // Hash master password for server authentication
      const masterPasswordHash = await CryptoService.hashPassword(masterPassword);

      // Register user
      const response = await authAPI.register(
        email,
        masterPasswordHash,
        encryptedVaultKey,
        salt
      );

      const { token: newToken, user: newUser } = response.data;

      // Store in state and localStorage
      setToken(newToken);
      setUser(newUser);
      setVaultKey(vaultKey);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('salt', salt);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const login = async (email: string, masterPassword: string, twoFactorToken?: string) => {
    try {
      // Hash master password
      const masterPasswordHash = await CryptoService.hashPassword(masterPassword);

      // Login
      const response = await authAPI.login(email, masterPasswordHash, twoFactorToken);

      if (response.data.requires2FA) {
        throw { requires2FA: true, message: response.data.message };
      }

      const { token: newToken, user: newUser } = response.data;

      // Derive vault key
      const salt = localStorage.getItem('salt') || CryptoService.generateSalt();
      localStorage.setItem('salt', salt);
      
      const vaultKey = await CryptoService.deriveMasterKey(masterPassword, salt);

      // Store in state and localStorage
      setToken(newToken);
      setUser(newUser);
      setVaultKey(vaultKey);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      if (error.requires2FA) {
        throw error;
      }
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setVaultKey(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('salt');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        vaultKey,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

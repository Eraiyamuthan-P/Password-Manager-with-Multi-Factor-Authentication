import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authAPI, User } from "../utils/api";
import CryptoService from "../utils/crypto";

interface AuthContextType {
  user: User | null;
  token: string | null;
  vaultKey: CryptoKey | null;
  login: (
    email: string,
    masterPassword: string,
    twoFactorToken?: string
  ) => Promise<any>;
  register: (email: string, masterPassword: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  refreshAuth: () => void; // ✅ NEW FUNCTION
  verifySignupOTP: (email: string, otp: string) => Promise<any>;
  verifyLoginOTP: (
    email: string,
    otp: string,
    masterPassword: string
  ) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedVaultKey = sessionStorage.getItem("vaultKey");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      if (storedVaultKey) {
        try {
          const keyData = JSON.parse(storedVaultKey);
          crypto.subtle
            .importKey(
              "raw",
              new Uint8Array(keyData),
              { name: "AES-GCM", length: 256 },
              true,
              ["encrypt", "decrypt"]
            )
            .then(setVaultKey)
            .catch((err) => {
              console.error("Failed to restore vault key:", err);
              sessionStorage.removeItem("vaultKey");
            });
        } catch (err) {
          console.error("Failed to parse vault key:", err);
          sessionStorage.removeItem("vaultKey");
        }
      }
    }
    setLoading(false);
  }, []);

  // ✅ Refresh AuthContext after face verification
  const refreshAuth = () => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      console.log("🔄 AuthContext refreshed after face verification");
    }
  };

  const register = async (email: string, masterPassword: string) => {
    try {
      const salt = CryptoService.generateSalt();
      const vaultKey = await CryptoService.deriveMasterKey(
        masterPassword,
        salt
      );
      const exportedKey = await crypto.subtle.exportKey("raw", vaultKey);
      const keyString = btoa(
        String.fromCharCode(...new Uint8Array(exportedKey))
      );
      const encryptedVaultKey = await CryptoService.encrypt(
        keyString,
        vaultKey
      );
      const masterPasswordHash = await CryptoService.hashPassword(
        masterPassword
      );
      const response = await authAPI.register(
        email,
        masterPasswordHash,
        encryptedVaultKey,
        salt
      );

      // If server returned a token (legacy/magic-link flow), finalize registration locally
      if (response.data.token) {
        const { token: newToken, user: newUser } = response.data;
        const exportedKeyForStorage = await crypto.subtle.exportKey(
          "raw",
          vaultKey
        );
        sessionStorage.setItem(
          "vaultKey",
          JSON.stringify(Array.from(new Uint8Array(exportedKeyForStorage)))
        );

        setToken(newToken);
        setUser(newUser);
        setVaultKey(vaultKey);
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));
        localStorage.setItem("salt", newUser.salt || salt);
        return response.data;
      }

      // New flow: server sent OTP to email. Persist the vaultKey temporarily so it can be restored after OTP verify.
      const exportedKeyForStorage = await crypto.subtle.exportKey(
        "raw",
        vaultKey
      );
      sessionStorage.setItem(
        "pendingVaultKey",
        JSON.stringify(Array.from(new Uint8Array(exportedKeyForStorage)))
      );
      localStorage.setItem("pendingRegisterEmail", email);

      // Let the caller (component) know OTP verification is required
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  };

  // Verify signup OTP and finalize registration
  const verifySignupOTP = async (email: string, otp: string) => {
    try {
      const response = await authAPI.verifySignupOTP(email, otp);
      const { token: newToken, user: newUser } = response.data;

      // Restore pending vault key
      const raw = sessionStorage.getItem("pendingVaultKey");
      if (raw) {
        const arr = new Uint8Array(JSON.parse(raw));
        const vaultKey = await crypto.subtle.importKey(
          "raw",
          arr,
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
        );
        setVaultKey(vaultKey);
        sessionStorage.setItem("vaultKey", JSON.stringify(Array.from(arr)));
        sessionStorage.removeItem("pendingVaultKey");
      }

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.removeItem("pendingRegisterEmail");

      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "OTP verification failed");
    }
  };

  // Verify login OTP and finalize login (derive vault key from provided master password)
  const verifyLoginOTP = async (
    email: string,
    otp: string,
    masterPassword: string
  ) => {
    try {
      const response = await authAPI.verifyLoginOTP(email, otp);
      const { token: newToken, user: newUser } = response.data;

      // Derive vault key using returned salt and provided master password
      const salt = newUser.salt;
      const vaultKey = await CryptoService.deriveMasterKey(
        masterPassword,
        salt
      );
      const exportedKeyForStorage = await crypto.subtle.exportKey(
        "raw",
        vaultKey
      );
      sessionStorage.setItem(
        "vaultKey",
        JSON.stringify(Array.from(new Uint8Array(exportedKeyForStorage)))
      );

      setToken(newToken);
      setUser(newUser);
      setVaultKey(vaultKey);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("salt", salt);

      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "OTP verification failed");
    }
  };

  const login = async (
    email: string,
    masterPassword: string,
    twoFactorToken?: string
  ) => {
    try {
      const masterPasswordHash = await CryptoService.hashPassword(
        masterPassword
      );
      const response = await authAPI.login(
        email,
        masterPasswordHash,
        twoFactorToken
      );

      if (response.data.requiresEmailOTP) {
        const err: any = new Error("Email OTP required");
        err.requiresEmailOTP = true;
        err.message = response.data.message || "Email OTP required";
        throw err;
      }

      if (response.data.requires2FA) {
        const err: any = new Error("2FA required");
        err.requires2FA = true;
        err.message = response.data.message || "2FA required";
        throw err;
      }
      if (response.data.requiresFaceAuth) {
        const err: any = new Error("Face auth required");
        err.requiresFaceAuth = true;
        err.message = response.data.message || "Face auth required";
        throw err;
      }

      const { token: newToken, user: newUser } = response.data;
      const salt = newUser.salt;
      if (!salt) throw new Error("Salt not found.");

      localStorage.setItem("salt", salt);
      const vaultKey = await CryptoService.deriveMasterKey(
        masterPassword,
        salt
      );
      const exportedKeyForStorage = await crypto.subtle.exportKey(
        "raw",
        vaultKey
      );
      sessionStorage.setItem(
        "vaultKey",
        JSON.stringify(Array.from(new Uint8Array(exportedKeyForStorage)))
      );

      setToken(newToken);
      setUser(newUser);
      setVaultKey(vaultKey);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (error: any) {
      // Re-throw structured errors so UI can react (2FA, face auth, email OTP)
      if (
        error.requires2FA ||
        error.requiresFaceAuth ||
        error.requiresEmailOTP
      ) {
        throw error;
      }
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setVaultKey(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("salt");
    sessionStorage.removeItem("vaultKey");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        vaultKey,
        login,
        register,
        verifySignupOTP,
        verifyLoginOTP,
        logout,
        isAuthenticated: !!user && !!token,
        loading,
        refreshAuth, // ✅ expose new method
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

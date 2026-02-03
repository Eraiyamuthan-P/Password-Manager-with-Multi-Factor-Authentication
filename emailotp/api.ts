// client/src/utils/api.ts
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  encryptedVaultKey: string;
  twoFactorEnabled: boolean;
  faceAuthEnabled: boolean;
  salt: string;
  createdAt: string;
}

export interface Password {
  _id: string;
  encryptedData: string;
  website: string;
  category: string;
  favorite: boolean;
  securityScore: number;
  breached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  total: number;
  breached: number;
  weak: number;
  favorites: number;
  averageSecurityScore: number;
}

// Auth APIs
export const authAPI = {
  register: (
    email: string,
    masterPasswordHash: string,
    encryptedVaultKey: string,
    salt: string
  ) =>
    api.post("/auth/register", {
      email,
      masterPasswordHash,
      encryptedVaultKey,
      salt,
    }),

  login: (email: string, masterPasswordHash: string, twoFactorToken?: string) =>
    api.post("/auth/login", { email, masterPasswordHash, twoFactorToken }),

  getMe: () => api.get("/auth/me"),

  setup2FA: () => api.post("/auth/2fa/setup"),

  verify2FA: (token: string, secret: string) =>
    api.post("/auth/2fa/verify", { token, secret }),

  // Email OTP verification endpoints (signup & login)
  verifySignupOTP: (email: string, otp: string) =>
    api.post("/auth/verify-signup-otp", { email, otp }),

  verifyLoginOTP: (email: string, otp: string) =>
    api.post("/auth/verify-login-otp", { email, otp }),

  resendOTP: (email: string, purpose: "signup" | "login" = "login") =>
    api.post("/auth/resend-otp", { email, purpose }),

  disable2FA: () => api.post("/auth/2fa/disable"),

  // FACE AUTH APIs — FIXED
  disableFaceAuth: () => api.post("/auth/face/disable"),
  enrollFace: (faceDescriptor: string) =>
    api.post("/auth/face/enroll", { faceDescriptor }),
  verifyFace: (email: string, faceDescriptor: string) =>
    api.post("/auth/face/verify", { email, faceDescriptor }),
};

// Password APIs
export const passwordAPI = {
  getAll: () => api.get<{ passwords: Password[] }>("/passwords"),

  getOne: (id: string) => api.get<{ password: Password }>(`/passwords/${id}`),

  create: (data: {
    encryptedData: string;
    website: string;
    category: string;
    securityScore: number;
  }) => api.post("/passwords", data),

  update: (id: string, data: Partial<Password>) =>
    api.put(`/passwords/${id}`, data),

  delete: (id: string) => api.delete(`/passwords/${id}`),

  toggleFavorite: (id: string) => api.patch(`/passwords/${id}/favorite`),

  getStats: () => api.get<{ stats: Stats }>("/passwords/stats/overview"),
};

// Security APIs
export const securityAPI = {
  checkBreach: (password: string) =>
    api.post<{ breached: boolean; message: string }>("/security/check-breach", {
      password,
    }),

  analyzeStrength: (password: string) =>
    api.post<{ score: number; strength: string; feedback: string[] }>(
      "/security/analyze-strength",
      { password }
    ),
  resendOTP: (email: string, purpose: "signup" | "login" = "login") =>
    api.post("/auth/resend-otp", { email, purpose }),

  generatePassword: (options: {
    length?: number;
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
  }) => api.post<{ password: string }>("/security/generate-password", options),
};

export default api;

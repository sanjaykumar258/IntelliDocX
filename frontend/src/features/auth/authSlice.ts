import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import { api } from '@/api/client';

export interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'HR_MANAGER' | 'IT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'GUEST';
  organizationId: string;
  name: string;
  isTwoFactorEnabled?: boolean;
  avatarUrl?: string | null;
  theme?: string;
  accentColor?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Rehydrate from localStorage on app start
const token = localStorage.getItem('token');
const local2fa = localStorage.getItem('isTwoFactorEnabled');
const cachedAvatarUrl = localStorage.getItem('avatarUrl');
const cachedTheme = localStorage.getItem('intellidocx-theme');
const cachedAccent = localStorage.getItem('accent');
let user: User | null = null;

if (token) {
  try {
    const decoded: any = jwtDecode(token);
    user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      name: decoded.name || decoded.email.split('@')[0],
      isTwoFactorEnabled: local2fa === 'true' ? true : (decoded.isTwoFactorEnabled || false),
      avatarUrl: cachedAvatarUrl || null,
      theme: cachedTheme || 'system',
      accentColor: cachedAccent || '#6366f1',
    };
  } catch (e) {
    // Malformed token — clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isTwoFactorEnabled');
    localStorage.removeItem('avatarUrl');
    localStorage.removeItem('intellidocx-theme');
    localStorage.removeItem('accent');
  }
}

const initialState: AuthState = {
  user,
  token,
  isAuthenticated: !!token && !!user,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called after a successful login (with or without 2FA)
    loginSuccess: (state, action: PayloadAction<{ token: string; refreshToken?: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      // Store refresh token for auto-refresh on expiry
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
      localStorage.setItem('isTwoFactorEnabled', action.payload.user.isTwoFactorEnabled ? 'true' : 'false');
      // Cache avatar URL for immediate rehydration on next page load
      if (action.payload.user.avatarUrl) {
        localStorage.setItem('avatarUrl', action.payload.user.avatarUrl);
      }
      if (action.payload.user.theme) {
        localStorage.setItem('intellidocx-theme', action.payload.user.theme);
      }
      if (action.payload.user.accentColor) {
        localStorage.setItem('accent', action.payload.user.accentColor);
      }
    },

    // Called when the user explicitly logs out
    logout: (state) => {
      // Best-effort: call API to blacklist the access token server-side
      const currentToken = state.token;
      const currentRefreshToken = localStorage.getItem('refreshToken');
      if (currentToken) {
        api.post('/auth/logout', { refreshToken: currentRefreshToken }).catch(() => {
          // Non-critical — token TTL will expire naturally
        });
      }

      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isTwoFactorEnabled');
      localStorage.removeItem('avatarUrl');
      localStorage.removeItem('intellidocx-theme');
      localStorage.removeItem('accent');
    },

    // Called after toggling 2FA in Settings
    updateUser2FA: (state, action: PayloadAction<boolean>) => {
      if (state.user) {
        state.user.isTwoFactorEnabled = action.payload;
        localStorage.setItem('isTwoFactorEnabled', action.payload ? 'true' : 'false');
      }
    },

    // Called after profile update (name / avatar / settings) from Settings page
    updateUserProfile: (state, action: PayloadAction<{ name?: string; avatarUrl?: string | null; theme?: string; accentColor?: string }>) => {
      if (state.user) {
        if (action.payload.name !== undefined) {
          state.user.name = action.payload.name;
        }
        if (action.payload.avatarUrl !== undefined) {
          state.user.avatarUrl = action.payload.avatarUrl;
          if (action.payload.avatarUrl) {
            localStorage.setItem('avatarUrl', action.payload.avatarUrl);
          } else {
            localStorage.removeItem('avatarUrl');
          }
        }
        if (action.payload.theme !== undefined) {
          state.user.theme = action.payload.theme;
          localStorage.setItem('intellidocx-theme', action.payload.theme);
        }
        if (action.payload.accentColor !== undefined) {
          state.user.accentColor = action.payload.accentColor;
          localStorage.setItem('accent', action.payload.accentColor);
        }
      }
    },
  },
});

export const { loginSuccess, logout, updateUser2FA, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;

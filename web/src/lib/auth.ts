export type UserRole =
  | "SUPER_ADMIN"
  | "SYNDIC"
  | "VICE_SYNDIC"
  | "CAISSIER"
  | "CASHIER"
  | "GARDIEN"
  | "SECRETAIRE"
  | "RESIDENT";

export type AuthUser = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const TOKEN_KEY = "easysyndic.web.token";
const USER_KEY = "easysyndic.web.user";

export const syndicRoles: UserRole[] = [
  "SYNDIC",
  "VICE_SYNDIC",
  "CAISSIER",
  "CASHIER",
  "GARDIEN",
  "SECRETAIRE",
];

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getHomeForRole(role?: UserRole) {
  if (role === "SUPER_ADMIN") return "/super-admin/dashboard";
  if (role && syndicRoles.includes(role)) return "/syndic/dashboard";
  return "/login";
}

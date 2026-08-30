import { createContext } from "react";
import type { LoginRequest, RegisterRequest } from "../types";

export interface AuthUser {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface AuthContextType {
  user: AuthUser | null;

  login: (data: LoginRequest) => Promise<void>;

  register: (data: RegisterRequest) => Promise<void>;

  logout: () => void;

  updateUser: (data: Partial<Pick<AuthUser, "firstName" | "lastName">>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

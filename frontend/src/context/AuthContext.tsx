import { useState } from "react";
import type { ReactNode } from "react";
import type { AuthResponse, LoginRequest, RegisterRequest } from "../types";
import * as authApi from "../api/auth";
import { AuthContext } from "./auth-context";
import type { AuthUser } from "./auth-context";

function storeSession(response: AuthResponse): AuthUser {
  const user: AuthUser = {
    email: response.email,
    role: response.role,
    firstName: response.firstName,
    lastName: response.lastName,
  };
  localStorage.setItem("token", response.token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      return JSON.parse(storedUser);
    }
    return null;
  });

  async function login(data: LoginRequest) {
    const response = await authApi.login(data);
    setUser(storeSession(response));
  }

  async function register(data: RegisterRequest) {
    const response = await authApi.register(data);
    setUser(storeSession(response));
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

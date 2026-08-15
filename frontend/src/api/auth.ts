import apiClient from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "../types";

export function login(data: LoginRequest): Promise<AuthResponse> {
  return apiClient
    .post<AuthResponse>("/auth/login", data)
    .then((response) => response.data);
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiClient
    .post<AuthResponse>("/auth/register", data)
    .then((response) => response.data);
}

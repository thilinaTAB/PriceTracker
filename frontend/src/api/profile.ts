import apiClient from "./client";

export interface ProfileResponse {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  role: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
}

export async function getProfile(): Promise<ProfileResponse> {
  const response = await apiClient.get<ProfileResponse>("/users/me");

  return response.data;
}

export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<ProfileResponse> {
  const response = await apiClient.put<ProfileResponse>("/users/me", data);

  return response.data;
}

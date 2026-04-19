export interface Role {
  id: number;
  code: string;
  name: string;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  active: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: User;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  status?: number;
  error?: string;
  message?: string;
  timestamp?: string;
  fieldErrors?: FieldError[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}
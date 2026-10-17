export type UserRole = 'student' | 'staff' | 'admin';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface AuthUser {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RoleUpdateRequest {
  role: UserRole;
  status: UserStatus;
}

export interface ProfileUpdateRequest {
  first_name: string;
  last_name: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

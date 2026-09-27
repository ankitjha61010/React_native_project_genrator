export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

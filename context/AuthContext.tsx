import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "@routetracker_auth";
const USERS_STORAGE_KEY = "@routetracker_users";

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  passwordHash: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Omit<User, "passwordHash"> | null;
}

interface AuthContextType extends AuthState {
  login: (employeeId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  employeeId: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const user = JSON.parse(authData);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    }
  };

  const getUsers = async (): Promise<User[]> => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error("Error loading users:", error);
      return [];
    }
  };

  const saveUsers = async (users: User[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error("Error saving users:", error);
    }
  };

  const login = async (employeeId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const users = await getUsers();
      const user = users.find((u) => u.employeeId.toLowerCase() === employeeId.toLowerCase());

      if (!user) {
        return { success: false, error: "Employee ID not found. Please register first." };
      }

      const passwordHash = simpleHash(password);
      if (user.passwordHash !== passwordHash) {
        return { success: false, error: "Incorrect password. Please try again." };
      }

      const authUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: authUser,
      });

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred. Please try again." };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const users = await getUsers();

      const existingUser = users.find(
        (u) => u.employeeId.toLowerCase() === data.employeeId.toLowerCase()
      );

      if (existingUser) {
        return { success: false, error: "This Employee ID is already registered." };
      }

      const existingEmail = users.find(
        (u) => u.email.toLowerCase() === data.email.toLowerCase()
      );

      if (existingEmail) {
        return { success: false, error: "This email is already registered." };
      }

      const newUser: User = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        email: data.email,
        employeeId: data.employeeId,
        passwordHash: simpleHash(data.password),
      };

      users.push(newUser);
      await saveUsers(users);

      const authUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        employeeId: newUser.employeeId,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: authUser,
      });

      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "An error occurred. Please try again." };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

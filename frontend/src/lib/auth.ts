import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

type UserRole = "LEARNER" | "CREATOR" | "ADMIN";

// API base URL - must be set in environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: UserRole;
    };
    accessToken?: string;
  }

  interface User {
    role: UserRole;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call the external backend API for login
          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          if (!data.user) {
            return null;
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            image: data.user.image,
            role: data.user.role as UserRole,
            accessToken: data.token,
          };
        } catch (error) {
          console.error("Login error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

// Helper function to get session on server
export async function auth() {
  return getServerSession(authOptions);
}

// Helper function to check if user has required role
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

// Helper function to get current user from session
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

// Helper function to require authentication
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// Helper function to require specific roles
export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!hasRole(user.role, roles)) {
    throw new Error("Forbidden");
  }
  return user;
}

// Helper function to get access token for API calls
export async function getAccessToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken || null;
}

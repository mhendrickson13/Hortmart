"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoIcon } from "@/components/shared/logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        // Get session to check user role
        const session = await getSession();
        const userRole = session?.user?.role;
        
        // Redirect based on role
        if (userRole === "ADMIN" || userRole === "CREATOR") {
          router.push("/dashboard");
        } else {
          router.push("/courses");
        }
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <LogoIcon size="lg" />
          </div>

          <h1 className="text-h2 font-bold text-center text-text-1 mb-2">
            Welcome back
          </h1>
          <p className="text-body-sm text-text-2 text-center mb-8">
            Sign in to continue learning
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-danger text-center">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-body-sm text-text-2 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>

          {/* Demo accounts hint */}
          <div className="mt-8 p-4 rounded-xl bg-surface-3 border border-border">
            <p className="text-caption text-text-2 font-medium mb-2">Demo accounts:</p>
            <div className="space-y-1 text-caption text-text-3">
              <p>Learner: learner@videolecture.com / learner123</p>
              <p>Creator: creator@videolecture.com / creator123</p>
              <p>Admin: admin@videolecture.com / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

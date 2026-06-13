"use client";

import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardPage } from "@/components/dashboard-page";
import { LoginForm } from "@/components/login-form";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <LoginForm />;
  return <AuthGuard><DashboardPage /></AuthGuard>;
}

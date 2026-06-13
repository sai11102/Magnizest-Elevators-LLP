"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, ChevronUp } from "lucide-react";

export function LoginForm() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await resetPassword(email);
      if (error) setError(error);
      else setInfoMessage("A password reset link has been sent to your email.");
      setLoading(false);
      return;
    }

    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glass shadow-slate-950/20 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-center rounded-3xl bg-sky-500/10 p-5 text-sky-300 shadow-lg shadow-sky-500/10">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950/80 text-2xl font-black">M</div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-white">Magnizest Elevators LLP</h1>
            <p className="mt-2 text-sm text-slate-400">AMC Management System for elevator contracts, services, and notifications.</p>
          </div>
        </div>

        <Card className="border border-white/10 bg-slate-950/80 shadow-glass shadow-slate-950/20 backdrop-blur-xl">
          <CardHeader className="space-y-2 border-b border-white/10 pb-4 px-6 pt-6">
            <CardTitle className="text-2xl text-white">{isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Admin Login"}</CardTitle>
            <CardDescription className="text-slate-400">
              {isForgotPassword
                ? "Enter your email to receive a reset link."
                : isSignUp
                ? "Set up your admin account"
                : "Secure access for Magnizest AMC control."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {infoMessage && (
                <Alert>
                  <AlertDescription>{infoMessage}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@magnizest.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
                </div>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Please wait..." : isForgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
              </Button>
              <div className="flex flex-col gap-3 text-center text-sm text-slate-400">
                {!isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setInfoMessage(null);
                      setIsSignUp(false);
                    }}
                    className="hover:text-sky-300 transition-colors"
                  >
                    Forgot your password?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp((state) => !state);
                    setIsForgotPassword(false);
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="hover:text-sky-300 transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Need an account? Create one"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/85 p-4 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-200">Contact</p>
          <p>040-23096856 | +91 9491003300</p>
          <p className="mt-1">abhinav@magnizest.com</p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Magnizest Elevators LLP. All rights reserved.</p>
      </div>
    </div>
  );
}

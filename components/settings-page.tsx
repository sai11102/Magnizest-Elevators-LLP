"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Building2, Phone, Mail, Moon, Sun, LogOut, User } from "lucide-react";

export function SettingsPage() {
  const { user, updateEmail, signOut } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [serviceAlerts, setServiceAlerts] = useState(true);
  const [amcAlerts, setAmcAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    const prefs = localStorage.getItem("magnizest-settings");
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        setServiceAlerts(parsed.serviceAlerts ?? true);
        setAmcAlerts(parsed.amcAlerts ?? true);
        setMarketingEmails(parsed.marketingEmails ?? false);
        setDarkMode(parsed.theme !== "light");
      } catch {
        // ignore malformed preferences
      }
    }
  }, [user]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    if (!user) {
      setError("You must be signed in to save settings.");
      setLoading(false);
      return;
    }

    if (email && email !== user.email) {
      const { error } = await updateEmail(email);
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
    }

    localStorage.setItem(
      "magnizest-settings",
      JSON.stringify({ serviceAlerts, amcAlerts, marketingEmails, theme: darkMode ? "dark" : "light" })
    );

    setInfoMessage("Your company preferences were saved successfully.");
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-8 space-y-3">
        <p className="text-sm uppercase tracking-[0.28em] text-sky-300">Settings</p>
        <h1 className="text-3xl font-semibold text-white">System & Profile Settings</h1>
        <p className="max-w-3xl text-slate-400">
          Manage Magnizest company details, theme preferences, and your account in one secure location.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15 backdrop-blur-xl">
            <CardHeader className="space-y-2 p-6">
              <div className="flex items-center gap-3 text-slate-100">
                <Building2 className="h-5 w-5 text-sky-300" />
                <CardTitle className="text-lg">Company Information</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Static company details for Magnizest Elevators LLP are displayed here for internal reference.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 text-sm text-slate-200">
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Company Name</p>
                <p className="mt-1 font-semibold">Magnizest Elevators LLP</p>
              </div>
              <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-emerald-300" />
                  <span>040-23096856 | +91 9491003300</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-orange-300" />
                  <span>abhinav@magnizest.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sky-300">A</span>
                  <span>J. Abhinav Kumar Reddy</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15 backdrop-blur-xl">
            <CardHeader className="space-y-2 p-6">
              <div className="flex items-center gap-3 text-slate-100">
                <Sun className="h-5 w-5 text-yellow-300" />
                <CardTitle className="text-lg">Theme Settings</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Keep the interface optimized for dark operations, or switch to light mode for bright environments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <div>
                  <p className="font-medium">Dark theme</p>
                  <p className="text-xs text-slate-400">Default experience for modern elevator operations.</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-300">
                <p className="font-semibold">Current mode:</p>
                <p>{darkMode ? "Dark mode enabled" : "Light mode enabled"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15 backdrop-blur-xl">
          <CardHeader className="space-y-2 p-6">
            <div className="flex items-center gap-3 text-slate-100">
              <User className="h-5 w-5 text-sky-300" />
              <CardTitle className="text-lg">User Profile</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Update credentials and manage your session for secure access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
            {infoMessage && <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">{infoMessage}</div>}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email address</Label>
                <Input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-user-id">User ID</Label>
                <Input id="settings-user-id" type="text" value={user?.id ?? ""} disabled className="h-11 bg-slate-900/70" />
              </div>
            </div>
            <Button onClick={handleSave} className="h-11 w-full" disabled={loading}>
              {loading ? "Saving settings..." : "Save settings"}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="h-11 w-full text-white">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

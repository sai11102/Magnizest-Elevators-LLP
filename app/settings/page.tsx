"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SettingsPage } from "@/components/settings-page";

export default function Settings() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}

"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AboutPage } from "@/components/about-page";

export default function About() {
  return (
    <AuthGuard>
      <AboutPage />
    </AuthGuard>
  );
}

"use client"; import { AuthGuard } from "@/components/auth-guard"; import { SitePage } from "@/components/site-page"; export default function Sites() { return <AuthGuard><SitePage /></AuthGuard>; }

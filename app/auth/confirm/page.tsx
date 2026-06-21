"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // O access_token chega no hash fragment: #access_token=...&refresh_token=...
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            console.error("[auth/confirm] setSession error:", error.message);
            router.replace("/auth/error");
          } else {
            router.replace("/app");
          }
        });
    } else {
      // Sem tokens — tenta obter sessão existente
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace("/app");
        } else {
          router.replace("/auth/error");
        }
      });
    }
  }, [router]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Autenticando...
        </p>
      </div>
    </div>
  );
}

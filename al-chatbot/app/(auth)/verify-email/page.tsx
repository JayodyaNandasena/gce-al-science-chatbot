"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No verification token provided.");
      return;
    }
    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (res.ok) { setState("success"); setMessage(json.message); }
        else         { setState("error");   setMessage(json.error || "Verification failed"); }
      } catch {
        setState("error");
        setMessage("Something went wrong. Please try again.");
      }
    };
    verify();
  }, [token]);

  return (
      <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8 text-center">
        {state === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Verifying your email…</h2>
              <p className="text-sm text-muted-foreground">Please wait a moment.</p>
            </>
        )}

        {state === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Email verified!</h2>
              <p className="text-sm text-muted-foreground mb-6">{message}</p>
              <Link href="/login">
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 text-white font-medium">
                  Sign in to your account
                </Button>
              </Link>
            </>
        )}

        {state === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Verification failed</h2>
              <p className="text-sm text-muted-foreground mb-6">{message}</p>
              <Link href="/signup">
                <Button variant="outline" className="w-full h-11 rounded-xl">
                  Create a new account
                </Button>
              </Link>
            </>
        )}
      </div>
  );
}

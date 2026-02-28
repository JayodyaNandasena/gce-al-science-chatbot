"use client";

import {useState} from "react";
import Link from "next/link";
import {ArrowLeft, Loader2, Mail} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [emailError, setEmailErr] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const validate = (): boolean => {
        if (!email.trim()) {
            setEmailErr("Email is required");
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailErr("Enter a valid email address");
            return false;
        }
        setEmailErr("");
        return true;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email}),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "Something went wrong");
                return;
            }
            setSubmitted(true);
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8 text-center">
                <div className="flex justify-center mb-4">
                    <div
                        className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                        <Mail className="w-8 h-8 text-blue-500"/>
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Check your inbox</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    If an account with that email exists, you'll receive a password reset
                    link. It expires in 1 hour.
                </p>
                <Link href="/login">
                    <Button variant="outline" className="w-full h-11 rounded-xl">
                        <ArrowLeft size={16} className="mr-2"/>
                        Back to sign in
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Reset password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Enter your email and we'll send you a reset link
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailErr("");
                        }}
                        className={`h-11 rounded-xl bg-muted/50 focus:bg-background transition-colors ${
                            emailError ? "border-destructive" : ""
                        }`}
                    />
                    {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 hover:opacity-90 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : "Send reset link"}
                </Button>
            </form>

            <div className="mt-4">
                <Link href="/login">
                    <Button
                        variant="ghost"
                        className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft size={16} className="mr-2"/>
                        Back to sign in
                    </Button>
                </Link>
            </div>
        </div>
    );
}
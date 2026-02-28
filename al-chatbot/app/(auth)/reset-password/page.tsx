"use client";

import {useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {Eye, EyeOff, Loader2, CheckCircle2, XCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";

type Errors = {
    password?: string;
    confirmPassword?: string;
};

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirm] = useState("");
    const [showPassword, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Errors>({});

    const validate = (): boolean => {
        const e: Errors = {};
        if (!password) e.password = "Password is required";
        else if (password.length < 8) e.password = "At least 8 characters";
        else if (!/[A-Z]/.test(password)) e.password = "Include one uppercase letter";
        else if (!/[0-9]/.test(password)) e.password = "Include one number";
        if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const clear = (field: keyof Errors) =>
        setErrors((prev) => ({...prev, [field]: undefined}));

    // No token state
    if (!token) {
        return (
            <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-destructive"/>
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Invalid link</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    This password reset link is invalid or has expired.
                </p>
                <Link href="/forgot-password">
                    <Button
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 text-white font-medium">
                        Request a new link
                    </Button>
                </Link>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8 text-center">
                <div className="flex justify-center mb-4">
                    <div
                        className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600"/>
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Password updated</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Your password has been reset. You can now sign in with your new
                    password.
                </p>
                <Link href="/login">
                    <Button
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 text-white font-medium">
                        Sign in
                    </Button>
                </Link>
            </div>
        );
    }

    // Form
    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({token, password}),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "Failed to reset password");
                return;
            }
            setSuccess(true);
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputCls = (hasError: boolean) =>
        `h-11 rounded-xl bg-muted/50 focus:bg-background pr-10 transition-colors ${
            hasError ? "border-destructive" : ""
        }`;

    return (
        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">New password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Create a strong password for your account
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                clear("password");
                            }}
                            className={inputCls(!!errors.password)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                    {errors.password ? (
                        <p className="text-xs text-destructive">{errors.password}</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Min 8 chars · one uppercase · one number
                        </p>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirm(e.target.value);
                                clear("confirmPassword");
                            }}
                            className={inputCls(!!errors.confirmPassword)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showConfirm ? "Hide password" : "Show password"}
                        >
                            {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 hover:opacity-90 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : "Reset password"}
                </Button>
            </form>
        </div>
    );
}
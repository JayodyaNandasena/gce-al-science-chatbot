"use client";

import {useState} from "react";
import Link from "next/link";
import {Eye, EyeOff, Loader2, CheckCircle2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";

type Errors = {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirm] = useState("");
    const [showPassword, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Errors>({});

    const validate = (): boolean => {
        const e: Errors = {};
        if (!name.trim()) e.name = "Name is required";
        if (name.length < 2) e.name = "Name must be at least 2 characters";
        if (!email.trim()) e.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
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

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, password, name}),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "Signup failed");
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
                        className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600"/>
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Check your email</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    We've sent a verification link to your email. Click it to activate your account and start learning.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6">
                    Didn't receive it? Check your spam folder.
                </p>
                <Link href="/login">
                    <Button variant="outline" className="w-full h-11 rounded-xl">
                        Back to sign in
                    </Button>
                </Link>
            </div>
        );
    }

    const inputCls = (hasError: boolean) =>
        `h-11 rounded-xl bg-muted/50 focus:bg-background transition-colors ${
            hasError ? "border-destructive" : ""
        }`;

    return (
        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Create your account</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Start your A/L science journey today
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            clear("name");
                        }}
                        className={inputCls(!!errors.name)}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                {/* Email */}
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
                            clear("email");
                        }}
                        className={inputCls(!!errors.email)}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
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
                            className={`${inputCls(!!errors.password)} pr-10`}
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
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                            className={`${inputCls(!!errors.confirmPassword)} pr-10`}
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
                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : "Create account"}
                </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
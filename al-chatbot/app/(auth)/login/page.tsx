"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Eye, EyeOff, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validate = () => {
        const e: typeof errors = {};
        if (!email.trim()) e.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
        if (!password) e.password = "Password is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, password}),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "Login failed");
                return;
            }
            toast.success("Welcome back!");
            router.push("/dashboard");
            router.refresh();
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-1">Sign in to continue learning</p>
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
                            setErrors((p) => ({...p, email: undefined}));
                        }}
                        className={`h-11 rounded-xl bg-muted/50 focus:bg-background transition-colors ${errors.email ? "border-destructive" : ""}`}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password"
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setErrors((p) => ({...p, password: undefined}));
                            }}
                            className={`h-11 rounded-xl bg-muted/50 focus:bg-background pr-10 transition-colors ${errors.password ? "border-destructive" : ""}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 hover:opacity-90 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : "Sign in"}
                </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup"
                          className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
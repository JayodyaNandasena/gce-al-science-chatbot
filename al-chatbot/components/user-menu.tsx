"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {LogOut, ChevronDown, House, MessageCircle, BookOpenCheck, Notebook} from "lucide-react";
import { toast } from "sonner";

interface User {
    name?: string;
    email?: string;
}

function getInitials(user: User): string {
    if (user.name) return user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (user.email) return user.email[0].toUpperCase();
    return "?";
}

function getDisplayName(user: User): string {
    if (user.name) return user.name;
    if (user.email) return user.email.split("@")[0];
    return "Account";
}

const NAV_ITEMS = [
    { label: "Home",  href: "/home",  icon: House },
    { label: "Chat",  href: "/chat",  icon: MessageCircle },
    { label: "Quiz",  href: "/quiz",  icon: BookOpenCheck },
    { label: "Notes",  href: "/notes",  icon: Notebook },
];

export function UserMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (data?.user) setUser(data.user); })
            .catch(() => null);
    }, []);

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            toast.success("Signed out");
            router.push("/login");
            router.refresh();
        } catch {
            toast.error("Failed to sign out");
        }
    }

    if (!user) return null;

    const initials = getInitials(user);
    const displayName = getDisplayName(user);

    return (
        <>
            <style>{`
                .usermenu-wrap {
                    position: relative;
                    font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
                }
                .usermenu-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 6px 3px 3px;
                    border-radius: 10px;
                    border: 1px solid #e5e7eb;
                    background: white;
                    cursor: pointer;
                    transition: background 0.15s, border-color 0.15s;
                    font-family: inherit;
                    height: 34px;
                }
                .usermenu-btn:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }
                .usermenu-avatar {
                    width: 26px;
                    height: 26px;
                    border-radius: 7px;
                    background: linear-gradient(135deg, #059669, #0d9488);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .usermenu-avatar span {
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    font-family: inherit;
                    line-height: 1;
                }
                .usermenu-chevron {
                    color: #9ca3af;
                    transition: transform 0.2s;
                    flex-shrink: 0;
                }
                .usermenu-chevron.open { transform: rotate(180deg); }

                .usermenu-dropdown {
                    position: absolute;
                    top: calc(100% + 6px);
                    right: 0;
                    width: 210px;
                    background: white;
                    border: 1px solid #e8eaed;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.11);
                    overflow: hidden;
                    z-index: 100;
                    animation: um-drop 0.12s ease;
                    font-family: inherit;
                }
                @keyframes um-drop {
                    from { opacity: 0; transform: translateY(-5px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .usermenu-dropdown-header {
                    padding: 12px 14px 10px;
                    border-bottom: 1px solid #f1f3f5;
                }
                .usermenu-dropdown-name {
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 2px;
                }
                .usermenu-dropdown-email {
                    font-size: 11.5px;
                    color: #9ca3af;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .usermenu-nav-section {
                    padding: 6px;
                    border-bottom: 1px solid #f1f3f5;
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .usermenu-nav-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    padding: 8px 10px;
                    font-size: 13px;
                    font-weight: 500;
                    border-radius: 7px;
                    border: none;
                    cursor: pointer;
                    transition: background 0.12s;
                    font-family: inherit;
                    text-align: left;
                    text-decoration: none;
                    color: #374151;
                    background: none;
                }
                .usermenu-nav-item:hover { background: #f3f4f6; }
                .usermenu-nav-item.active {
                    background: #f0fdf4;
                    color: #059669;
                    font-weight: 600;
                }
                .usermenu-nav-item.active svg { color: #059669; }
                .usermenu-dropdown-item-logout {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    padding: 10px 14px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #dc2626;
                    background: none;
                    border: none;
                    cursor: pointer;
                    transition: background 0.12s;
                    font-family: inherit;
                    text-align: left;
                }
                .usermenu-dropdown-item-logout:hover { background: #fff5f5; }
            `}</style>

            <div className="usermenu-wrap" ref={ref}>
                <button className="usermenu-btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
                    <div className="usermenu-avatar">
                        <span>{initials}</span>
                    </div>
                    <ChevronDown size={11} strokeWidth={2.5} className={`usermenu-chevron${open ? " open" : ""}`} />
                </button>

                {open && (
                    <div className="usermenu-dropdown" role="menu">
                        {/* User info */}
                        <div className="usermenu-dropdown-header">
                            <div className="usermenu-dropdown-name">{displayName}</div>
                            {user.email && <div className="usermenu-dropdown-email">{user.email}</div>}
                        </div>

                        {/* Nav links */}
                        <div className="usermenu-nav-section">
                            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                                const isActive = pathname === href || pathname.startsWith(href + "/");
                                return (
                                    <button
                                        key={href}
                                        className={`usermenu-nav-item${isActive ? " active" : ""}`}
                                        onClick={() => { router.push(href); setOpen(false); }}
                                        role="menuitem"
                                    >
                                        <Icon size={14} />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sign out */}
                        <button className="usermenu-dropdown-item-logout" onClick={handleLogout} role="menuitem">
                            <LogOut size={14} />
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
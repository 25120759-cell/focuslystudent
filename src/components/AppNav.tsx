import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Shield, Users, Layers, LifeBuoy, FileText, Brain, Settings as SettingsIcon, Sparkles, ChevronDown, Gift, Activity } from "lucide-react";
import { useT } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isPublicPath } from "@/lib/publicRoutes";

export function AppNav() {
  const t = useT();

  const { user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [openMenu, setOpenMenu] = useState<null | "community" | "account">(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (isPublicPath(path)) return null;

  const primary = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-accent"
    }`;
  const iconBtn = (active: boolean) =>
    `inline-flex items-center justify-center h-8 w-8 rounded-full text-sm transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"
    }`;

  const communityActive = ["/cards", "/social", "/redeem"].some((p) => path === p || path.startsWith(p + "/"));
  const accountActive = path === "/settings" || path === "/usage" || path === "/support";

  return (
    <header className="sticky top-0 z-40 flex justify-center px-4 pt-4">
      <nav ref={ref} className="nav-pill flex items-center gap-1 rounded-full px-3 py-2 shadow-sm flex-wrap justify-center max-w-full">
        <Link to="/app" className="px-2 font-display text-base font-semibold tracking-tight flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-primary" /> Focusly
        </Link>

        <span className="mx-1 h-5 w-px bg-border" />

        {/* PRIMARY: productivity tools */}
        <Link to="/app" className={primary(path === "/app")}>{t("console")}</Link>
        <Link to="/assignments" className={primary(path.startsWith("/assignments"))}>{t("assignments")}</Link>
        <Link to="/calender" className={primary(path === "/calender")}>{t("calender")}</Link>
        <Link to="/notes" className={primary(path === "/notes")}>
          <Brain className="inline h-3.5 w-3.5 mr-1" /> AI Notes
        </Link>
        <Link to="/docs" className={primary(path.startsWith("/docs") && !path.startsWith("/docs/share"))}>
          <FileText className="inline h-3.5 w-3.5 mr-1" /> Docs
        </Link>

        <span className="mx-1 h-5 w-px bg-border" />

        {/* SECONDARY: community dropdown */}
        <Dropdown
          open={openMenu === "community"}
          onToggle={() => setOpenMenu((m) => (m === "community" ? null : "community"))}
          label="Community"
          active={communityActive}
          items={[
            { to: "/social", label: "Social feed", icon: Users },
            { to: "/cards", label: "Cards", icon: Layers },
            
            { to: "/redeem", label: "Redeem code", icon: Gift },
          ]}
        />

        {/* ACCOUNT dropdown */}
        <Dropdown
          open={openMenu === "account"}
          onToggle={() => setOpenMenu((m) => (m === "account" ? null : "account"))}
          label={<SettingsIcon className="h-4 w-4" />}
          ariaLabel="Account menu"
          active={accountActive}
          compact
          items={[
            { to: "/settings", label: "Settings", icon: SettingsIcon },
            { to: "/usage", label: "AI Usage", icon: Activity },
            { to: "/support", label: "Support", icon: LifeBuoy },
            ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
          ]}
        />

        <span className="mx-1 h-5 w-px bg-border" />

        {user ? (
          <button onClick={signOut} title={user.email ?? "Sign out"} className={iconBtn(false)}>
            <LogOut className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Link to="/login" className={iconBtn(false)} title="Sign in">
            <LogIn className="h-3.5 w-3.5" />
          </Link>
        )}
      </nav>
    </header>
  );
}

function Dropdown({ open, onToggle, label, ariaLabel, items, active, compact = false }: {
  open: boolean;
  onToggle: () => void;
  label: React.ReactNode;
  ariaLabel?: string;
  items: { to: string; label: string; icon: any }[];
  active: boolean;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 ${compact ? "h-8 px-2" : "px-3 py-1.5"} rounded-full text-sm font-medium transition-colors ${
          active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"
        }`}
      >
        {label}
        {!compact && <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-card shadow-lg p-1 z-50"
          >
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to} onClick={onToggle} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent">
                  <Icon className="h-4 w-4 text-muted-foreground" /> {it.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

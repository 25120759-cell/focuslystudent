import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Shield, Users, Layers, LifeBuoy, FileText, Brain, Settings as SettingsIcon, Sparkles, ChevronDown, Gift, Activity, CalendarDays, Clock, ClipboardList, Menu, X } from "lucide-react";
import { useT } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isPublicPath } from "@/lib/publicRoutes";

export function AppNav() {
  const t = useT();

  const { user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [openMenu, setOpenMenu] = useState<null | "community" | "account">(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenMenu(null); }, [path]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMobileOpen(false); setOpenMenu(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (mq.matches) setMobileOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (isPublicPath(path)) return null;

  const communityActive = ["/cards", "/social", "/redeem"].some((p) => path === p || path.startsWith(p + "/"));
  const accountActive = path === "/settings" || path === "/usage" || path === "/support";

  const primaryItems = [
    { to: "/app", label: t("console"), icon: Clock, match: (p: string) => p === "/app" },
    { to: "/assignments", label: t("assignments"), icon: ClipboardList, match: (p: string) => p.startsWith("/assignments") },
    { to: "/calender", label: t("calender"), icon: CalendarDays, match: (p: string) => p === "/calender" },
    { to: "/notes", label: "AI Notes", icon: Brain, match: (p: string) => p === "/notes" },
    { to: "/docs", label: "Docs", icon: FileText, match: (p: string) => p.startsWith("/docs") && !p.startsWith("/docs/share") },
  ];

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? "border-border/70 bg-[color-mix(in_oklab,var(--background)_85%,transparent)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div ref={ref} className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-5 sm:py-3.5">
        {/* Wordmark */}
        <Link to="/app" className="group flex items-baseline gap-2 shrink-0">
          <span className="font-display text-lg font-semibold tracking-tight">Focusly</span>
          <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)] transition-transform duration-300 group-hover:rotate-12" />
        </Link>

        <span className="hidden lg:block h-6 w-px bg-border/80" />

        {/* PRIMARY: productivity tools */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm">
          {primaryItems.map((item) => {
            const active = item.match(path);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link font-medium ${active ? "nav-link-active" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* SECONDARY */}
        <div className="hidden lg:flex items-center gap-2">
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

          {user ? (
            <button
              onClick={signOut}
              title={user.email ?? "Sign out"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              to="/login"
              title="Sign in"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              <LogIn className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Mobile trigger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            id="mobile-nav"
            className="lg:hidden overflow-hidden border-t border-border/60 bg-card/95 backdrop-blur-xl"
          >
            <div className="mx-auto max-h-[calc(100dvh-4.5rem)] max-w-7xl overflow-y-auto overscroll-contain px-4 py-4 grid gap-1 sm:px-5">
              {primaryItems.map((item) => (
                <MobileLink key={item.to} to={item.to} label={item.label} icon={item.icon} active={item.match(path)} />
              ))}
              <div className="hairline my-2" />
              <MobileLink to="/social" label="Social feed" icon={Users} active={path === "/social"} />
              <MobileLink to="/cards" label="Cards" icon={Layers} active={path === "/cards"} />
              <MobileLink to="/redeem" label="Redeem code" icon={Gift} active={path === "/redeem"} />
              <div className="hairline my-2" />
              <MobileLink to="/settings" label="Settings" icon={SettingsIcon} active={path === "/settings"} />
              <MobileLink to="/usage" label="AI Usage" icon={Activity} active={path === "/usage"} />
              <MobileLink to="/support" label="Support" icon={LifeBuoy} active={path === "/support"} />
              {isAdmin && <MobileLink to="/admin" label="Admin" icon={Shield} active={path === "/admin"} />}
              {user && (
                <button onClick={signOut} className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileLink({ to, label, icon: Icon, active }: { to: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-accent/40"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
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
        className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${
          compact ? "h-9 w-9 justify-center" : "px-3.5 py-1.5"
        } text-sm font-medium ${
          active
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border/70 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        }`}
      >
        {label}
        {!compact && <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl z-50"
          >
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to} onClick={onToggle} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent/50 hover:text-foreground">
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

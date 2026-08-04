import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Shield, Users, Layers, LifeBuoy, FileText, Brain, Settings as SettingsIcon, Sparkles, Gift, Activity, CalendarDays, Clock, ClipboardList, Menu, X } from "lucide-react";
import { useT } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isPublicPath } from "@/lib/publicRoutes";

export function AppNav() {
  const t = useT();

  const { user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
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


  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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

  const primaryItems = [
    { to: "/app", label: t("console"), icon: Clock, match: (p: string) => p === "/app" },
    { to: "/assignments", label: t("assignments"), icon: ClipboardList, match: (p: string) => p.startsWith("/assignments") },
    { to: "/calender", label: t("calender"), icon: CalendarDays, match: (p: string) => p === "/calender" },
    { to: "/notes", label: "AI Notes", icon: Brain, match: (p: string) => p === "/notes" },
    { to: "/docs", label: "Docs", icon: FileText, match: (p: string) => p.startsWith("/docs") && !p.startsWith("/docs/share") },
  ];

  const communityItems = [
    { to: "/social", label: "Social", icon: Users, match: (p: string) => p === "/social" },
    { to: "/cards", label: "Cards", icon: Layers, match: (p: string) => p === "/cards" },
    { to: "/redeem", label: "Redeem", icon: Gift, match: (p: string) => p === "/redeem" },
  ];

  const accountItems = [
    { to: "/settings", label: "Settings", icon: SettingsIcon, match: (p: string) => p === "/settings" },
    { to: "/usage", label: "Usage", icon: Activity, match: (p: string) => p === "/usage" },
    { to: "/support", label: "Support", icon: LifeBuoy, match: (p: string) => p === "/support" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield, match: (p: string) => p === "/admin" }] : []),
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-[color-mix(in_oklab,var(--background)_75%,transparent)] backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div ref={ref} className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-5">
        {/* Wordmark */}
        <Link to="/app" className="group flex shrink-0 items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">Focusly</span>
          <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)] transition-transform duration-500 group-hover:rotate-180" />
        </Link>

        {/* Sticky pill bar — every destination in one animated rail */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="nav-pill hidden lg:flex mx-auto items-center gap-0.5 rounded-full px-1.5 py-1.5 shadow-sm"
        >
          {primaryItems.map((item) => (
            <PillLink key={item.to} {...item} active={item.match(path)} emphasis />
          ))}
          <span className="mx-1 h-5 w-px bg-border/70" />
          {communityItems.map((item) => (
            <PillLink key={item.to} {...item} active={item.match(path)} />
          ))}
          <span className="mx-1 h-5 w-px bg-border/70" />
          {accountItems.map((item) => (
            <PillLink key={item.to} {...item} active={item.match(path)} iconOnly />
          ))}
        </motion.nav>

        <div className="flex-1 lg:hidden" />

        <div className="hidden lg:flex shrink-0 items-center">
          {user ? (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.94 }}
              onClick={signOut}
              title={user.email ?? "Sign out"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </motion.button>
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
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mobileOpen ? "x" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
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
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.03 } } }}
              className="mx-auto max-h-[calc(100dvh-4.5rem)] max-w-7xl overflow-y-auto overscroll-contain px-4 py-4 grid gap-1 sm:px-5"
            >
              {[...primaryItems, ...communityItems, ...accountItems].map((item) => (
                <motion.div
                  key={item.to}
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                >
                  <MobileLink to={item.to} label={item.label} icon={item.icon} active={item.match(path)} />
                </motion.div>
              ))}
              {user && (
                <button onClick={signOut} className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function PillLink({
  to,
  label,
  icon: Icon,
  active,
  emphasis = false,
  iconOnly = false,
}: {
  to: string;
  label: string;
  icon: any;
  active: boolean;
  emphasis?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Link
      to={to}
      title={label}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
        emphasis ? "font-semibold" : "font-medium"
      } ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {active && (
        <motion.span
          layoutId="app-nav-active"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-full bg-primary"
        />
      )}
      <motion.span whileHover={{ y: -1 }} className="relative flex items-center gap-1.5">
        <Icon className={emphasis ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {!iconOnly && <span>{label}</span>}
      </motion.span>
    </Link>
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

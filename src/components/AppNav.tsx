import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, LogOut, Shield, Users, Layers, LifeBuoy } from "lucide-react";
import { useT, useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { SettingsModal } from "./SettingsModal";

const NAV_HIDDEN = ["/landing", "/plans", "/updates", "/login", "/signup", "/engagement", "/support"];

export function AppNav() {
  const t = useT();
  const { state } = useStore();
  const { user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [openSettings, setOpenSettings] = useState(false);

  // Hide on fully public marketing pages and on dynamic /updates/$slug
  if (NAV_HIDDEN.includes(path) || path.startsWith("/updates/")) return null;

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:text-foreground hover:bg-accent"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 flex justify-center px-4 pt-4">
        <nav className="nav-pill flex items-center gap-1 rounded-full px-3 py-2 shadow-sm flex-wrap justify-center">
          <Link to="/app" className="px-2 font-display text-base font-semibold tracking-tight">Focusly:</Link>
          <Link to="/app" className={linkClass(path === "/app")}>{t("console")}</Link>
          <Link to="/assignments" className={linkClass(path.startsWith("/assignments"))}>{t("assignments")}</Link>
          <Link to="/calender" className={linkClass(path === "/calender")}>{t("calender")}</Link>
          <Link to="/social" className={linkClass(path === "/social")} title="Social">
            <Users className="inline h-3.5 w-3.5" /> <span className="hidden sm:inline">Social</span>
          </Link>
          <Link to="/cards" className={linkClass(path === "/cards")} title="Cards">
            <Layers className="inline h-3.5 w-3.5" /> <span className="hidden sm:inline">Cards</span>
          </Link>
          <span className="mx-1 h-5 w-px bg-border" />
          <button onClick={() => setOpenSettings(true)} className={linkClass(false)}>{t("settings")}</button>
          <Link to="/rewards" className={linkClass(path === "/rewards")}>
            {t("rewards")} <span className="ml-1 text-xs opacity-70">{state.gamification.points}</span>
          </Link>
          <Link to="/support" className={linkClass(path === "/support")} title="Support">
            <LifeBuoy className="inline h-3.5 w-3.5" />
          </Link>
          {isAdmin && (
            <Link to="/admin" className={linkClass(path === "/admin")} title="Admin">
              <Shield className="inline h-3.5 w-3.5" />
            </Link>
          )}
          <span className="mx-1 h-5 w-px bg-border" />
          {user ? (
            <button onClick={signOut} title={user.email ?? "Sign out"} className={linkClass(false)}>
              <LogOut className="inline h-3.5 w-3.5" />
            </button>
          ) : (
            <Link to="/login" className={linkClass(false)} title="Sign in">
              <LogIn className="inline h-3.5 w-3.5" />
            </Link>
          )}
        </nav>
      </header>
      <SettingsModal open={openSettings} onOpenChange={setOpenSettings} />
    </>
  );
}

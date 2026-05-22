import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useT, useStore } from "@/lib/store";
import { SettingsModal } from "./SettingsModal";

const PUBLIC_ROUTES = ["/landing", "/plans", "/updates"];



export function AppNav() {
  const t = useT();
  const { state } = useStore();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [openSettings, setOpenSettings] = useState(false);

  if (PUBLIC_ROUTES.includes(path)) return null;



  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:text-foreground hover:bg-accent"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 flex justify-center px-4 pt-4">
        <nav className="nav-pill flex items-center gap-1 rounded-full px-3 py-2 shadow-sm">
          <span className="px-2 font-display text-base font-semibold tracking-tight">Focusly:</span>
          <Link to="/" className={linkClass(path === "/")}>{t("console")}</Link>
          <Link to="/assignments" className={linkClass(path === "/assignments")}>{t("assignments")}</Link>
          <Link to="/calender" className={linkClass(path === "/calender")}>{t("calender")}</Link>
          <span className="mx-1 h-5 w-px bg-border" />
          <button onClick={() => setOpenSettings(true)} className={linkClass(false)}>{t("settings")}</button>
          <Link to="/rewards" className={linkClass(path === "/rewards")}>
            {t("rewards")} <span className="ml-1 text-xs opacity-70">{state.gamification.points}</span>
          </Link>
        </nav>
      </header>
      <SettingsModal open={openSettings} onOpenChange={setOpenSettings} />
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Palette, Bell, Type, CalendarDays, Languages, Bot, ShieldCheck, User2, Clock } from "lucide-react";
import { useStore, useT, type FontSize, type Language, type Theme, type CalendarView } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Focusly" }] }),
});

const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "reading", label: "Reading & layout", icon: Type },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "language", label: "Language", icon: Languages },
  { id: "ai", label: "AI assistant", icon: Bot },
  { id: "timer", label: "Study timer", icon: Clock },
  { id: "account", label: "Account", icon: User2 },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
] as const;

const LANGS = [
  { code: "english", flag: "🇬🇧", name: "English" },
  { code: "mandarin", flag: "🇨🇳", name: "Mandarin" },
  { code: "spanish", flag: "🇪🇸", name: "Spanish" },
  { code: "italian", flag: "🇮🇹", name: "Italian" },
  { code: "french", flag: "🇫🇷", name: "French" },
];

function SettingsPage() {
  const { state, dispatch } = useStore();
  const { user, signOut } = useAuth();
  const t = useT();
  const s = state.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "PATCH_SETTINGS", patch: p });
  const [active, setActive] = useState("appearance");

  useEffect(() => {
    const onScroll = () => {
      let curr = "appearance";
      for (const sec of SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el && el.getBoundingClientRect().top < 140) curr = sec.id;
      }
      setActive(curr);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function jump(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start">
        <h1 className="font-display text-2xl font-semibold mb-4">Settings</h1>
        <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = active === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => jump(sec.id)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {sec.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="space-y-6">
        <Section id="appearance" title="Appearance" desc="Theme and visual style of the app.">
          <Row label={t("colorMode")}>
            <Seg<Theme> value={s.theme} options={[{ v: "light", label: t("light") }, { v: "dark", label: t("dark") }]} onChange={(v) => patch({ theme: v })} />
          </Row>
        </Section>

        <Section id="notifications" title="Notifications" desc="Reminders for due assignments and timer milestones.">
          <Row label={t("notifications")}>
            <Seg<"yes" | "no"> value={s.notifications ? "yes" : "no"} options={[{ v: "yes", label: t("yes") }, { v: "no", label: t("no") }]} onChange={(v) => patch({ notifications: v === "yes" })} />
          </Row>
        </Section>

        <Section id="reading" title="Reading & layout" desc="Adjust text density across the app.">
          <Row label={t("fontSize")}>
            <Seg<FontSize> value={s.fontSize} options={[{ v: "large", label: t("large") }, { v: "medium", label: t("medium") }, { v: "small", label: t("small") }]} onChange={(v) => patch({ fontSize: v })} />
          </Row>
        </Section>

        <Section id="calendar" title="Calendar" desc="Default view when you open the calendar.">
          <Row label={t("calendarView")}>
            <Seg<CalendarView> value={s.calendarView} options={[{ v: "yearly", label: t("yearly") }, { v: "monthly", label: t("monthly") }, { v: "weekly", label: t("weekly") }]} onChange={(v) => patch({ calendarView: v })} />
          </Row>
        </Section>

        <Section id="language" title="Language" desc="App interface language.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGS.map((l) => {
              const supported = l.code === "english" || l.code === "mandarin";
              const isActive = s.language === l.code;
              return (
                <button
                  key={l.code}
                  disabled={!supported}
                  onClick={() => supported && patch({ language: l.code as Language })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    isActive ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"
                  } ${!supported ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className="flex-1 text-left">{l.name}</span>
                  {!supported && <span className="text-[10px] text-muted-foreground">soon</span>}
                </button>
              );
            })}
          </div>
        </Section>

        <Section id="ai" title="AI assistant" desc="How Focusly AI talks to you.">
          <Row label="Personality">
            <Seg<"tutor" | "coach" | "zen"> value={s.assistantPersonality} options={[{ v: "tutor", label: "Tutor" }, { v: "coach", label: "Coach" }, { v: "zen", label: "Zen" }]} onChange={(v) => patch({ assistantPersonality: v })} />
          </Row>
          <p className="text-xs text-muted-foreground mt-2">
            View your quota and history on the <a href="/usage" className="text-primary underline">AI usage</a> page.
          </p>
        </Section>

        <Section id="timer" title="Study timer" desc="Pomodoro session and break length.">
          <Row label="Study minutes">
            <input type="number" min={5} max={120} value={s.studyDuration} onChange={(e) => patch({ studyDuration: Number(e.target.value) || 25 })} className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm" />
          </Row>
          <Row label="Break minutes">
            <input type="number" min={1} max={60} value={s.breakDuration} onChange={(e) => patch({ breakDuration: Number(e.target.value) || 5 })} className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm" />
          </Row>
        </Section>

        <Section id="account" title="Account" desc="Your sign-in details.">
          <Row label="Signed in as"><span className="text-sm text-muted-foreground">{user?.email ?? "—"}</span></Row>
          <div className="mt-2">
            <button onClick={signOut} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-destructive hover:text-destructive-foreground">Sign out</button>
          </div>
        </Section>

        <Section id="privacy" title="Privacy" desc="Data handling and legal links.">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your study data is stored privately under your account. AI-generated artifacts are cached locally for offline access and backed up to your account.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <a href="https://luraapps.base44.app/legal" target="_blank" rel="noreferrer" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">Legal & policies</a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="paper-raised p-6 scroll-mt-24">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">{desc}</p>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-muted p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`px-3 py-1 text-xs rounded-full transition-colors ${value === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

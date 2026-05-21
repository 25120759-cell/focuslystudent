import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, useT, type FontSize, type Language, type Theme, type CalendarView } from "@/lib/store";

const LANGS = [
  { code: "english", flag: "🇬🇧", name: "English" },
  { code: "mandarin", flag: "🇨🇳", name: "Mandarin" },
  { code: "spanish", flag: "🇪🇸", name: "Spanish" },
  { code: "italian", flag: "🇮🇹", name: "Italian" },
  { code: "french", flag: "🇫🇷", name: "French" },
];

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            value === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { state, dispatch } = useStore();
  const t = useT();
  const [langOpen, setLangOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => LANGS.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );
  const s = state.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "PATCH_SETTINGS", patch: p });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Settings & Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <Row label={t("colorMode")}>
            <Seg<Theme>
              value={s.theme}
              options={[{ v: "light", label: t("light") }, { v: "dark", label: t("dark") }]}
              onChange={(v) => patch({ theme: v })}
            />
          </Row>
          <Row label={t("notifications")}>
            <Seg<"yes" | "no">
              value={s.notifications ? "yes" : "no"}
              options={[{ v: "yes", label: t("yes") }, { v: "no", label: t("no") }]}
              onChange={(v) => patch({ notifications: v === "yes" })}
            />
          </Row>
          <Row label={t("fontSize")}>
            <Seg<FontSize>
              value={s.fontSize}
              options={[
                { v: "large", label: t("large") },
                { v: "medium", label: t("medium") },
                { v: "small", label: t("small") },
              ]}
              onChange={(v) => patch({ fontSize: v })}
            />
          </Row>
          <Row label={t("calendarView")}>
            <Seg<CalendarView>
              value={s.calendarView}
              options={[
                { v: "yearly", label: t("yearly") },
                { v: "monthly", label: t("monthly") },
                { v: "weekly", label: t("weekly") },
              ]}
              onChange={(v) => patch({ calendarView: v })}
            />
          </Row>
          <Row label={t("language")}>
            <div className="flex items-center gap-2">
              <Seg<Language>
                value={s.language}
                options={[{ v: "english", label: t("english") }, { v: "mandarin", label: t("mandarin") }]}
                onChange={(v) => patch({ language: v })}
              />
              <button
                onClick={() => setLangOpen(true)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs italic text-muted-foreground hover:text-foreground"
              >
                *{t("selectLanguage")}*
              </button>
            </div>
          </Row>
          <div className="border-t border-border pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Gemini API Key</label>
            <input
              type="password"
              value={s.geminiKey}
              onChange={(e) => patch({ geminiKey: e.target.value })}
              placeholder="Paste your Gemini key..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Row label="AI Personality">
            <Seg<"tutor" | "coach" | "zen">
              value={s.assistantPersonality}
              options={[{ v: "tutor", label: "Tutor" }, { v: "coach", label: "Coach" }, { v: "zen", label: "Zen" }]}
              onChange={(v) => patch({ assistantPersonality: v })}
            />
          </Row>
        </div>
      </DialogContent>
      <Dialog open={langOpen} onOpenChange={setLangOpen}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("selectLanguage")}</DialogTitle>
          </DialogHeader>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {filtered.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  if (l.code === "english" || l.code === "mandarin") {
                    patch({ language: l.code as Language });
                  }
                  setLangOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="text-xl">{l.flag}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

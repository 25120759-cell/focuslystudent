import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, useT } from "@/lib/store";
import { Coins, Trophy } from "lucide-react";

export const Route = createFileRoute("/rewards")({
  ssr: false,
  component: RewardsPage,
  head: () => ({
    meta: [
      { title: "Rewards — Focusly" },
      { name: "description", content: "Earn points for completing assignments and redeem fun vouchers." },
    ],
  }),
});

const VOUCHERS = [
  { id: "mcd", name: "RM5 McDonald Voucher", cost: 50, codePrefix: "MCD", color: "bg-tt-peach" },
  { id: "sbx", name: "RM5 Starbucks Voucher", cost: 50, codePrefix: "SBX", color: "bg-tt-teal" },
];

function RewardsPage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const [redeemed, setRedeemed] = useState<string | null>(null);

  const g = state.gamification;
  const lastVoucher = g.redeemedVouchers[g.redeemedVouchers.length - 1];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">{t("rewards")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="h-6 w-6 text-primary" />
            <p className="font-display text-xl">{t("level")} {g.level}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {g.completedCount}/{g.assignmentsToNextLevel} → Level {g.level + 1}
          </p>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(g.completedCount / g.assignmentsToNextLevel) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs italic text-muted-foreground">{t("nextLevel")}</p>
        </div>

        <div className="rounded-3xl glass p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("points")}</p>
          <p className="font-display text-5xl font-light mt-1">{g.points}</p>
          <div className="mt-3 coin-stack">
            {Array.from({ length: Math.min(8, Math.ceil(g.points / 20)) }).map((_, i) => (
              <span key={i} className="coin" />
            ))}
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Rules</p>
          <p className="text-sm">{t("pointsRule")}</p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Vouchers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VOUCHERS.map((v) => (
            <div key={v.id} className={`rounded-3xl glass p-6 flex items-center justify-between ${v.color}`}>
              <div>
                <p className="font-display text-lg font-semibold">{v.name}</p>
                <p className="text-xs flex items-center gap-1 mt-1"><Coins className="h-3 w-3" /> {v.cost} {t("points")}</p>
              </div>
              <button
                disabled={g.points < v.cost}
                onClick={() => {
                  dispatch({ type: "REDEEM", voucher: v });
                  setRedeemed(v.name);
                }}
                className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 disabled:opacity-40"
              >
                {t("redeem")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {g.redeemedVouchers.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">{t("redeemed")}</h2>
          <div className="space-y-2">
            {g.redeemedVouchers.map((r, i) => (
              <div key={i} className="rounded-2xl glass px-4 py-3 flex items-center justify-between">
                <span className="text-sm">{r.name}</span>
                <code className="text-xs font-mono bg-accent rounded px-2 py-0.5">{r.code}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!redeemed} onOpenChange={(o) => !o && setRedeemed(null)}>
        <DialogContent className="glass max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">🎉 Redeemed!</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{redeemed}</p>
          {lastVoucher && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Validation code</p>
              <code className="text-lg font-mono bg-accent rounded px-3 py-2 inline-block">{lastVoucher.code}</code>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

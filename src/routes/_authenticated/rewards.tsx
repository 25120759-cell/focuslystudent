import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Coffee, Pizza, ShoppingBag, Sparkles } from "lucide-react";
import { useStore, useT } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
  head: () => ({ meta: [{ title: "Rewards — Focusly" }] }),
});

const VOUCHERS = [
  { id: "starbucks-50", name: "Starbucks $5", cost: 50, codePrefix: "SBX", icon: Coffee },
  { id: "mcd-100", name: "McDonald's Meal", cost: 100, codePrefix: "MCD", icon: Pizza },
  { id: "amazon-200", name: "Amazon $20", cost: 200, codePrefix: "AMZ", icon: ShoppingBag },
];

function RewardsPage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const { points, level, redeemedVouchers } = state.gamification;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-[color:var(--gold)]" /> {t("rewards")}
        </h1>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t("level")} {level}</div>
          <motion.div
            key={points}
            initial={{ scale: 1.2, color: "#facc15" }}
            animate={{ scale: 1, color: "currentColor" }}
            className="font-display text-2xl font-semibold"
          >
            {points} <span className="text-sm font-normal text-muted-foreground">{t("points")}</span>
          </motion.div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("pointsRule")} · {t("nextLevel")}</p>

      <div className="grid gap-4 md:grid-cols-3">
        {VOUCHERS.map((v) => {
          const Icon = v.icon;
          const canRedeem = points >= v.cost;
          return (
            <motion.div
              key={v.id}
              whileHover={{ y: -4 }}
              className="rounded-3xl glass p-5 flex flex-col"
            >
              <Icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display text-lg font-semibold">{v.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{v.cost} {t("points")}</p>
              <button
                onClick={() => dispatch({ type: "REDEEM", voucher: v })}
                disabled={!canRedeem}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40 hover:opacity-90"
              >
                {t("redeem")}
              </button>
            </motion.div>
          );
        })}
      </div>

      {redeemedVouchers.length > 0 && (
        <div className="rounded-3xl glass p-5">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" /> {t("redeemed")}
          </h2>
          <div className="space-y-2">
            <AnimatePresence>
              {redeemedVouchers.slice().reverse().map((v) => (
                <motion.div
                  key={v.redeemedAt}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span>{v.name}</span>
                  <code className="rounded bg-muted px-2 py-0.5 text-xs">{v.code}</code>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

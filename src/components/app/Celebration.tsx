import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type CelebrationKind = "subtask" | "assignment";

type Burst = { id: number; kind: CelebrationKind; variant: number; label: string };

const EVENT = "focusly:celebrate";

const SUBTASK_LABELS = ["Nice one!", "Ticked off ✅", "Progress!", "One down", "Keep rolling", "Crushed it"];
const ASSIGNMENT_LABELS = ["Assignment complete!", "Done and dusted!", "Big win 🎉", "That's a wrap!", "Legendary finish", "Submitted energy ✨"];

const SUBTASK_VARIANTS = 5;
const ASSIGNMENT_VARIANTS = 5;

/** Fire a celebration. Each call picks a different animation than the last. */
export function celebrate(kind: CelebrationKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { kind } }));
}

const PALETTE = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function CelebrationLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    let lastSub = -1;
    let lastAssign = -1;
    function onEvt(e: Event) {
      const kind = ((e as CustomEvent).detail?.kind ?? "subtask") as CelebrationKind;
      const count = kind === "assignment" ? ASSIGNMENT_VARIANTS : SUBTASK_VARIANTS;
      const last = kind === "assignment" ? lastAssign : lastSub;
      let variant = Math.floor(Math.random() * count);
      if (count > 1 && variant === last) variant = (variant + 1) % count;
      if (kind === "assignment") lastAssign = variant;
      else lastSub = variant;

      const labels = kind === "assignment" ? ASSIGNMENT_LABELS : SUBTASK_LABELS;
      const label = labels[Math.floor(Math.random() * labels.length)];
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, kind, variant, label }]);
      const ttl = kind === "assignment" ? 2600 : 1600;
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), ttl);
    }
    window.addEventListener(EVENT, onEvt as EventListener);
    return () => window.removeEventListener(EVENT, onEvt as EventListener);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {bursts.map((b) => (
          <BurstView key={b.id} burst={b} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function BurstView({ burst }: { burst: Burst }) {
  const { kind, variant, label } = burst;
  if (kind === "subtask") {
    switch (variant) {
      case 0:
        return <SparkRing label={label} />;
      case 1:
        return <PopBadge label={label} emoji="✅" />;
      case 2:
        return <MiniConfetti label={label} pieces={22} />;
      case 3:
        return <RisingEmojis label={label} set={["⭐", "✨", "💫"]} />;
      default:
        return <SwipeBanner label={label} />;
    }
  }
  switch (variant) {
    case 0:
      return <MiniConfetti label={label} pieces={90} big />;
    case 1:
      return <Fireworks label={label} />;
    case 2:
      return <RisingEmojis label={label} set={["🎉", "🎊", "🏆", "🥳", "✨"]} big />;
    case 3:
      return <TrophyStamp label={label} />;
    default:
      return <RadiantWave label={label} />;
  }
}

/* ---------- shared label ---------- */

function CenterLabel({ label, big }: { label: string; big?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <div
        className={`rounded-full border border-border bg-card/95 shadow-lg backdrop-blur ${
          big ? "px-6 py-3 font-display text-xl font-semibold" : "px-4 py-2 text-sm font-medium"
        }`}
      >
        {label}
      </div>
    </motion.div>
  );
}

/* ---------- variants ---------- */

function SparkRing({ label }: { label: string }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0.9, scale: 0.2 }}
        animate={{ opacity: 0, scale: 1.6 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-primary"
      />
      <motion.div
        initial={{ opacity: 0.7, scale: 0.2 }}
        animate={{ opacity: 0, scale: 2.2 }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.12 }}
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/60"
      />
      <CenterLabel label={label} />
    </>
  );
}

function PopBadge({ label, emoji }: { label: string; emoji: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3, rotate: -12 }}
      animate={{ opacity: 1, scale: [0.3, 1.15, 1], rotate: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-xl backdrop-blur"
    >
      <motion.span
        animate={{ rotate: [0, 14, -10, 0] }}
        transition={{ duration: 0.6 }}
        className="text-2xl"
      >
        {emoji}
      </motion.span>
      <span className="text-sm font-medium">{label}</span>
    </motion.div>
  );
}

function MiniConfetti({ label, pieces, big }: { label: string; pieces: number; big?: boolean }) {
  const [items] = useState(() =>
    Array.from({ length: pieces }, () => ({
      x: rand(5, 95),
      dx: rand(-90, 90),
      dy: rand(big ? 320 : 160, big ? 760 : 340),
      rot: rand(-540, 540),
      size: rand(6, big ? 14 : 10),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      delay: rand(0, 0.25),
      round: Math.random() > 0.6,
    })),
  );
  return (
    <>
      {items.map((it, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, y: -20, x: 0, rotate: 0 }}
          animate={{ opacity: [1, 1, 0], y: it.dy, x: it.dx, rotate: it.rot }}
          transition={{ duration: big ? 2.2 : 1.4, delay: it.delay, ease: "easeIn" }}
          style={{
            left: `${it.x}%`,
            top: big ? "12%" : "28%",
            width: it.size,
            height: it.size * (it.round ? 1 : 0.5),
            background: it.color,
            borderRadius: it.round ? 999 : 2,
          }}
          className="absolute"
        />
      ))}
      <CenterLabel label={label} big={big} />
    </>
  );
}

function RisingEmojis({ label, set, big }: { label: string; set: string[]; big?: boolean }) {
  const [items] = useState(() =>
    Array.from({ length: big ? 24 : 10 }, () => ({
      x: rand(8, 92),
      drift: rand(-50, 50),
      delay: rand(0, 0.5),
      size: rand(big ? 22 : 16, big ? 42 : 26),
      e: set[Math.floor(Math.random() * set.length)],
    })),
  );
  return (
    <>
      {items.map((it, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: big ? -420 : -220, x: it.drift, scale: 1 }}
          transition={{ duration: big ? 2.3 : 1.5, delay: it.delay, ease: "easeOut" }}
          style={{ left: `${it.x}%`, bottom: "12%", fontSize: it.size }}
          className="absolute"
        >
          {it.e}
        </motion.span>
      ))}
      <CenterLabel label={label} big={big} />
    </>
  );
}

function SwipeBanner({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="absolute left-1/2 top-24 -translate-x-1/2 overflow-hidden rounded-full border border-border bg-card/95 px-5 py-2 shadow-lg backdrop-blur"
    >
      <span className="relative z-10 text-sm font-medium">{label}</span>
      <motion.span
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
      />
    </motion.div>
  );
}

function Fireworks({ label }: { label: string }) {
  const [shells] = useState(() =>
    Array.from({ length: 5 }, () => ({
      cx: rand(18, 82),
      cy: rand(18, 55),
      delay: rand(0, 0.7),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      n: 16,
      r: rand(70, 150),
    })),
  );
  return (
    <>
      {shells.map((s, si) => (
        <div key={si} className="absolute" style={{ left: `${s.cx}%`, top: `${s.cy}%` }}>
          {Array.from({ length: s.n }).map((_, i) => {
            const angle = (i / s.n) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: Math.cos(angle) * s.r,
                  y: Math.sin(angle) * s.r + 40,
                  scale: 0.4,
                }}
                transition={{ duration: 1.4, delay: s.delay, ease: "easeOut" }}
                style={{ background: s.color }}
                className="absolute h-1.5 w-1.5 rounded-full"
              />
            );
          })}
        </div>
      ))}
      <CenterLabel label={label} big />
    </>
  );
}

function TrophyStamp({ label }: { label: string }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 2.4, rotate: -18 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 1.2 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
      >
        <motion.span
          animate={{ y: [0, -10, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.4, repeat: 1 }}
          className="text-6xl"
        >
          🏆
        </motion.span>
        <div className="rounded-full border border-border bg-card/95 px-6 py-2 font-display text-lg font-semibold shadow-xl backdrop-blur">
          {label}
        </div>
      </motion.div>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, x: Math.cos(angle) * 180, y: Math.sin(angle) * 180, scale: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            style={{ background: PALETTE[i % PALETTE.length] }}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
          />
        );
      })}
    </>
  );
}

function RadiantWave({ label }: { label: string }) {
  return (
    <>
      {[0, 0.18, 0.36].map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.55, scale: 0.1 }}
          animate={{ opacity: 0, scale: 3 }}
          transition={{ duration: 1.8, delay: d, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.35), transparent 70%)" }}
        />
      ))}
      <motion.div
        initial={{ opacity: 0, rotate: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.8, 0], rotate: 90, scale: 1.4 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, hsl(var(--primary)/0.35), transparent, hsl(var(--primary)/0.25), transparent)",
          borderRadius: 999,
        }}
      />
      <CenterLabel label={label} big />
    </>
  );
}

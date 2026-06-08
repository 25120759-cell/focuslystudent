import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Package, Coins, ArrowLeftRight, Check, X } from "lucide-react";
import { getWallet, openPack, listMyCards, sellCard, listMyTrades, respondTrade } from "@/lib/cards.functions";
import { rarityGradient, rarityRing, rarityLabel, getCatalog, CARD_SELL_VALUE, CARD_ART, type CardDef } from "@/lib/cards";

export const Route = createFileRoute("/_authenticated/cards")({
  component: CardsPage,
  head: () => ({ meta: [{ title: "Cards — Focusly" }] }),
});

interface Wallet { coins: number; plan: string; packsOpened: number; packLimit: number; packCost: number }
interface OwnedCard { instance_id: string; card: CardDef; obtained_at: string }
interface Trade { id: string; status: string; direction: "incoming" | "outgoing"; offerCard: CardDef | null; requestCard: CardDef | null }

function CardArt({ card }: { card: CardDef }) {
  const art = CARD_ART[card.id];
  if (art) {
    return <img src={art} alt="" loading="lazy" width={300} height={400} className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${rarityGradient(card.rarity)}`}>
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 60%)" }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ repeat: Infinity, duration: 3 }}
      />
    </div>
  );
}

// Holographic shimmer overlay for rare+ cards
function Holo({ rarity }: { rarity: CardDef["rarity"] }) {
  if (rarity === "common") return null;
  const colors =
    rarity === "eclipse"
      ? "linear-gradient(115deg, transparent 0%, rgba(255,200,80,0.5) 40%, rgba(168,85,247,0.5) 50%, rgba(255,200,80,0.5) 60%, transparent 100%)"
      : rarity === "legendary"
        ? "linear-gradient(115deg, transparent 0%, rgba(251,191,36,0.45) 45%, rgba(255,255,255,0.7) 50%, rgba(251,146,60,0.45) 55%, transparent 100%)"
        : rarity === "epic"
          ? "linear-gradient(115deg, transparent 0%, rgba(217,70,239,0.4) 50%, rgba(168,85,247,0.4) 55%, transparent 100%)"
          : "linear-gradient(115deg, transparent 0%, rgba(56,189,248,0.4) 50%, transparent 100%)";
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 mix-blend-overlay"
      style={{ background: colors, backgroundSize: "200% 200%" }}
      animate={{ backgroundPosition: ["-100% -100%", "200% 200%"] }}
      transition={{ repeat: Infinity, duration: rarity === "eclipse" ? 2.5 : 3.5, ease: "linear" }}
    />
  );
}

function GameCard({ card, onClick, badge, large }: { card: CardDef; onClick?: () => void; badge?: string; large?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-50, 50], [10, -10]), { damping: 18, stiffness: 220 });
  const ry = useSpring(useTransform(mx, [-50, 50], [-10, 10]), { damping: 18, stiffness: 220 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left - rect.width / 2);
    my.set(e.clientY - rect.top - rect.height / 2);
  }
  function onLeave() { mx.set(0); my.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onClick}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", transformPerspective: 800 }}
      className={`relative ${large ? "w-56 aspect-[3/4]" : "w-40 aspect-[3/4]"} rounded-2xl ring-2 ${rarityRing(card.rarity)} overflow-hidden cursor-${onClick ? "pointer" : "default"} bg-card`}
    >
      <CardArt card={card} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/40" />
      <Holo rarity={card.rarity} />
      <div className="absolute inset-0 flex flex-col justify-between p-2 text-white">
        <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider">
          <span className="rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur">{rarityLabel(card.rarity)}</span>
          {badge && <span className="rounded-full bg-primary/80 px-1.5 py-0.5">{badge}</span>}
        </div>
        <div>
          <div className="text-xs font-display font-semibold leading-tight drop-shadow">{card.name}</div>
          <div className="mt-1 flex items-center justify-between text-[10px] opacity-90">
            <span>⚡ {card.power}</span>
            <span>◎ {card.focus}</span>
          </div>
        </div>
      </div>
      {card.rarity === "eclipse" && (
        <motion.div className="pointer-events-none absolute -inset-1 rounded-2xl border-2 border-amber-400"
          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.8 }} />
      )}
      {card.rarity === "legendary" && (
        <motion.div className="pointer-events-none absolute -inset-0.5 rounded-2xl border border-amber-300/60"
          animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ repeat: Infinity, duration: 2.6 }} />
      )}
    </motion.div>
  );
}

function CardsPage() {
  const walletFn = useServerFn(getWallet);
  const openFn = useServerFn(openPack);
  const listFn = useServerFn(listMyCards);
  const sellFn = useServerFn(sellCard);
  const tradesFn = useServerFn(listMyTrades);
  const respondFn = useServerFn(respondTrade);

  const [tab, setTab] = useState<"open" | "collection" | "browse" | "trades">("open");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [owned, setOwned] = useState<OwnedCard[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [opening, setOpening] = useState(false);
  const [pulled, setPulled] = useState<CardDef[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const [w, c, t] = await Promise.all([walletFn(), listFn(), tradesFn()]);
      setWallet(w as any); setOwned((c as any).cards); setTrades((t as any).trades);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function openOne() {
    setOpening(true); setPulled(null); setErr(null);
    try {
      const r: any = await openFn();
      setPulled(r.cards);
      await refresh();
    } catch (e: any) { setErr(e.message); }
    finally { setOpening(false); }
  }

  const canOpen = wallet && wallet.coins >= wallet.packCost && wallet.packsOpened < wallet.packLimit;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Focusly Cards
        </h1>
        {wallet && (
          <div className="flex items-center gap-2">
            <motion.span
              key={wallet.coins}
              initial={{ scale: 0.92 }} animate={{ scale: 1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow"
            >
              <Coins className="h-4 w-4" /> {wallet.coins.toLocaleString()}
            </motion.span>
            <span className="rounded-full bg-card border border-border px-2.5 py-1 text-[10px] uppercase font-medium">{wallet.plan}</span>
          </div>
        )}
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs">
        {(["open", "collection", "browse", "trades"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 capitalize transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "open" ? "Open packs" : t === "browse" ? "All 500" : t}
          </button>
        ))}
      </div>

      {tab === "open" && (
        <div className="rounded-3xl glass p-6 text-center">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <Package className="mx-auto h-10 w-10 text-primary" />
          </motion.div>
          <h2 className="mt-3 font-display text-xl font-semibold">Booster pack — 5 cards</h2>
          {wallet && (
            <p className="mt-1 text-sm text-muted-foreground">
              {wallet.packCost} coins · {wallet.packsOpened}/{wallet.packLimit} packs today
            </p>
          )}
          <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }} onClick={openOne}
            disabled={opening || !canOpen}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {opening ? "Opening…" : !wallet ? "Loading…" : !canOpen && wallet.coins < wallet.packCost ? `Need ${wallet.packCost - wallet.coins} more coins` : !canOpen ? "Daily limit reached" : "Open pack"}
          </motion.button>
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
          <AnimatePresence>
            {pulled && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex flex-wrap justify-center gap-4 perspective-1000">
                {pulled.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ rotateY: 180, opacity: 0, y: 30 }}
                    animate={{ rotateY: 0, opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2, type: "spring", damping: 16, stiffness: 110 }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <GameCard card={c} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {tab === "collection" && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">{owned.length} cards owned · Tap to sell back for coins</p>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {owned.map((o) => (
                <motion.div key={o.instance_id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <GameCard card={o.card} badge={`+${CARD_SELL_VALUE[o.card.rarity]}c`} onClick={async () => {
                    if (!confirm(`Sell ${o.card.name} for ${CARD_SELL_VALUE[o.card.rarity]} coins?`)) return;
                    try { await sellFn({ data: { instance_id: o.instance_id } }); await refresh(); }
                    catch (e: any) { alert(e.message); }
                  }} />
                </motion.div>
              ))}
            </AnimatePresence>
            {owned.length === 0 && <p className="text-sm text-muted-foreground py-8">Open a pack to start your collection.</p>}
          </div>
        </div>
      )}

      {tab === "browse" && <Browse />}

      {tab === "trades" && (
        <div className="space-y-3">
          {trades.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No trades yet. Use the in-game share link from a friend's collection to send a trade offer.</p>}
          {trades.map((t) => (
            <div key={t.id} className="rounded-2xl glass p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase font-semibold text-primary">{t.direction}</span>
                <div className="text-sm">
                  {t.offerCard && <span className="font-medium">{t.offerCard.name}</span>}
                  <ArrowLeftRight className="inline mx-2 h-3 w-3 text-muted-foreground" />
                  {t.requestCard && <span>{t.requestCard.name}</span>}
                </div>
              </div>
              {t.direction === "incoming" && t.status === "pending" ? (
                <div className="flex gap-1">
                  <button onClick={async () => { try { await respondFn({ data: { trade_id: t.id, accept: true } }); refresh(); } catch (e: any) { alert(e.message); } }}
                    className="rounded-full bg-primary p-1.5 text-primary-foreground"><Check className="h-3 w-3" /></button>
                  <button onClick={async () => { await respondFn({ data: { trade_id: t.id, accept: false } }); refresh(); }}
                    className="rounded-full border border-border p-1.5"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <span className="text-[10px] uppercase text-muted-foreground">{t.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Browse() {
  const [rarity, setRarity] = useState<string>("all");
  const all = getCatalog();
  const filtered = rarity === "all" ? all : all.filter((c) => c.rarity === rarity);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
        {["all", "eclipse", "legendary", "epic", "rare", "common"].map((r) => (
          <button key={r} onClick={() => setRarity(r)}
            className={`rounded-full px-2.5 py-1 capitalize border ${rarity === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{r}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {filtered.slice(0, 200).map((c) => <GameCard key={c.id} card={c} />)}
      </div>
      {filtered.length > 200 && <p className="mt-3 text-xs text-muted-foreground text-center">Showing first 200 of {filtered.length}.</p>}
    </div>
  );
}

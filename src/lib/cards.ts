// 500-card procedural catalog for the Focusly TCG.
// Cards are referenced by integer id (0-499). Id 0 is the unique Eclipse card.

import eclipseArt from "@/assets/eclipse-card.jpg";
import phoenixArt from "@/assets/legendary-phoenix.jpg";
import archonArt from "@/assets/legendary-archon.jpg";
import guardianArt from "@/assets/legendary-guardian.jpg";
import deadlineArt from "@/assets/legendary-deadline.jpg";
import sovereignArt from "@/assets/legendary-sovereign.jpg";
import kingArt from "@/assets/legendary-king.jpg";
import empressArt from "@/assets/legendary-empress.jpg";
import lordArt from "@/assets/legendary-lord.jpg";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "eclipse";

export interface CardDef {
  id: number;
  name: string;
  rarity: Rarity;
  power: number; // 1-100
  focus: number; // 1-100
  flavor: string;
}

const RARITY_GRADIENTS: Record<Rarity, string> = {
  common: "from-slate-400 to-slate-600",
  rare: "from-sky-400 to-indigo-600",
  epic: "from-fuchsia-500 to-purple-700",
  legendary: "from-amber-400 to-orange-600",
  eclipse: "from-violet-700 via-amber-500 to-black",
};

const RARITY_RING: Record<Rarity, string> = {
  common: "ring-slate-500/40",
  rare: "ring-sky-500/60",
  epic: "ring-fuchsia-500/70",
  legendary: "ring-amber-500/80 shadow-[0_0_30px_-5px] shadow-amber-500/40",
  eclipse: "ring-amber-400 shadow-[0_0_60px_-5px] shadow-amber-500/70",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  eclipse: "✦ Eclipse",
};

export function rarityGradient(r: Rarity) { return RARITY_GRADIENTS[r]; }
export function rarityRing(r: Rarity) { return RARITY_RING[r]; }
export function rarityLabel(r: Rarity) { return RARITY_LABEL[r]; }

// Eclipse art (id 0) + 8 unique legendary arts cycled across all 24 legendary ids (1-24).
const LEGENDARY_ART = [phoenixArt, archonArt, guardianArt, deadlineArt, sovereignArt, kingArt, empressArt, lordArt];
export const CARD_ART: Record<number, string> = (() => {
  const map: Record<number, string> = { 0: eclipseArt };
  for (let i = 0; i < 24; i++) map[1 + i] = LEGENDARY_ART[i % LEGENDARY_ART.length];
  return map;
})();

// Emoji symbols per noun — rare cards render the static glyph, epic cards animate it.
export const NOUN_EMOJI: Record<string, string> = {
  Sage: "🧙", Owl: "🦉", Lantern: "🏮", Compass: "🧭", Pendulum: "⏱️",
  Cipher: "🔐", Tome: "📚", Quill: "🪶", Glyph: "🔣", Sigil: "✴️",
  Mantra: "🕉️", Algorithm: "💠", Theorem: "📐", Equation: "➗", Hourglass: "⏳",
  Inkwell: "🖋️", Lexicon: "📖", Prism: "🔺", Beacon: "🚨", Codex: "📜",
};
export function cardEmoji(name: string): string {
  for (const key of Object.keys(NOUN_EMOJI)) if (name.includes(key)) return NOUN_EMOJI[key];
  return "✨";
}

// Pack pull weights (out of 100,000). Eclipse is 1-in-1,000,000 handled separately.
const PACK_WEIGHTS = { common: 60000, rare: 28000, epic: 9000, legendary: 3000 } as const;

const ADJ = [
  "Ancient", "Astral", "Blazing", "Crystal", "Distant", "Echoing", "Eternal",
  "Fading", "Flowing", "Glowing", "Hidden", "Inverted", "Lucid", "Midnight",
  "Neon", "Quiet", "Radiant", "Shifting", "Silent", "Spectral", "Sublime",
  "Twilight", "Velvet", "Whispering", "Wild",
];

const NOUN = [
  "Sage", "Owl", "Lantern", "Compass", "Pendulum", "Cipher", "Tome", "Quill",
  "Glyph", "Sigil", "Mantra", "Algorithm", "Theorem", "Equation", "Hourglass",
  "Inkwell", "Lexicon", "Prism", "Beacon", "Codex",
];

const SUFFIX = ["of Focus", "of Recall", "of Insight", "of Discipline", "of Flow"];

const COMMON_NAMES = [
  "Library Mouse", "Sticky Note Sprite", "Pencil Pixie", "Highlighter Imp",
  "Coffee Goblin", "Eraser Wisp", "Page Marker", "Cram Caddy",
];

const LEGENDARY_NAMES = [
  "Pomodoro Phoenix", "Algebra Archon", "Grammar Guardian", "The Last Deadline",
  "Sovereign of Syllabi", "King of Quizzes", "Empress of Essays", "Lord of Lectures",
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = Math.imul(48271, s) % 0x7fffffff; return (s & 0xfffffff) / 0xfffffff; };
}

let CATALOG: CardDef[] | null = null;

export function getCatalog(): CardDef[] {
  if (CATALOG) return CATALOG;
  const cards: CardDef[] = [];

  // 0: Eclipse — 1-in-1M unique card
  cards.push({
    id: 0,
    name: "The Eclipse",
    rarity: "eclipse",
    power: 100,
    focus: 100,
    flavor: "Once in a lifetime. The moment focus and chaos align.",
  });

  // 1-24: Legendary (24)
  for (let i = 0; i < 24; i++) {
    const r = rng(1000 + i);
    cards.push({
      id: 1 + i,
      name: LEGENDARY_NAMES[i % LEGENDARY_NAMES.length] + (i >= LEGENDARY_NAMES.length ? ` ${Math.floor(i / LEGENDARY_NAMES.length) + 1}` : ""),
      rarity: "legendary",
      power: 80 + Math.floor(r() * 20),
      focus: 80 + Math.floor(r() * 20),
      flavor: "A legend whispered between deadlines.",
    });
  }

  // 25-99: Epic (75)
  for (let i = 0; i < 75; i++) {
    const r = rng(2000 + i);
    const adj = ADJ[Math.floor(r() * ADJ.length)];
    const noun = NOUN[Math.floor(r() * NOUN.length)];
    const sfx = SUFFIX[Math.floor(r() * SUFFIX.length)];
    cards.push({
      id: 25 + i,
      name: `${adj} ${noun} ${sfx}`,
      rarity: "epic",
      power: 55 + Math.floor(r() * 25),
      focus: 55 + Math.floor(r() * 25),
      flavor: "An epic moment of clarity.",
    });
  }

  // 100-249: Rare (150)
  for (let i = 0; i < 150; i++) {
    const r = rng(3000 + i);
    const adj = ADJ[Math.floor(r() * ADJ.length)];
    const noun = NOUN[Math.floor(r() * NOUN.length)];
    cards.push({
      id: 100 + i,
      name: `${adj} ${noun}`,
      rarity: "rare",
      power: 30 + Math.floor(r() * 25),
      focus: 30 + Math.floor(r() * 25),
      flavor: "Rare, but worth the search.",
    });
  }

  // 250-499: Common (250)
  for (let i = 0; i < 250; i++) {
    const r = rng(4000 + i);
    const base = COMMON_NAMES[i % COMMON_NAMES.length];
    cards.push({
      id: 250 + i,
      name: base + (i >= COMMON_NAMES.length ? ` #${Math.floor(i / COMMON_NAMES.length) + 1}` : ""),
      rarity: "common",
      power: 5 + Math.floor(r() * 25),
      focus: 5 + Math.floor(r() * 25),
      flavor: "Every collection starts here.",
    });
  }

  CATALOG = cards;
  return cards;
}

export function getCard(id: number): CardDef | undefined {
  return getCatalog().find((c) => c.id === id);
}

export function rollPack(seedFn?: () => number): number[] {
  const r = seedFn ?? Math.random;
  const out: number[] = [];
  for (let i = 0; i < 5; i++) {
    // Eclipse pull: 1 in 1,000,000
    if (r() < 0.000001) { out.push(0); continue; }
    const roll = r() * 100000;
    let pool: Rarity;
    if (roll < PACK_WEIGHTS.common) pool = "common";
    else if (roll < PACK_WEIGHTS.common + PACK_WEIGHTS.rare) pool = "rare";
    else if (roll < PACK_WEIGHTS.common + PACK_WEIGHTS.rare + PACK_WEIGHTS.epic) pool = "epic";
    else pool = "legendary";
    const candidates = getCatalog().filter((c) => c.rarity === pool);
    out.push(candidates[Math.floor(r() * candidates.length)].id);
  }
  return out;
}

export const CARD_SELL_VALUE: Record<Rarity, number> = {
  common: 5,
  rare: 15,
  epic: 50,
  legendary: 200,
  eclipse: 100000,
};

export const PACK_COST = 50;
export const PACK_DAILY_LIMIT: Record<string, number> = { free: 2, pro: 10, max: 50 };

// Web Audio API based chimes
let ctx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function chime(freq = 880, duration = 0.4) {
  const ac = getCtx();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  o.connect(g).connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + duration);
}

export function alarm() {
  chime(660, 0.3);
  setTimeout(() => chime(880, 0.3), 220);
  setTimeout(() => chime(990, 0.5), 440);
}

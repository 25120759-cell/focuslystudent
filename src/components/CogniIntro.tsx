import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import cogniMark from "@/assets/cogni-mark.png";

const WORDS = ["This", "Is", "Cogni."];

/** Full-screen opening sequence: words appear one at a time, then the logo shines in. */
export function CogniIntro() {
  const [show, setShow] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (sessionStorage.getItem("cogni-intro-seen") || reduced) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => finish(), 4200);
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (!show) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") finish(); };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [show]);

  function finish() {
    sessionStorage.setItem("cogni-intro-seen", "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          exit={{ opacity: 0, y: -40, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-night text-brand-ink"
          onClick={finish}
        >
          <div className="relative flex flex-wrap justify-center gap-x-4 px-4 font-display text-4xl font-semibold sm:text-6xl md:text-8xl" aria-label="This Is Cogni.">
            {WORDS.map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.3 + i * 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={i === 2 ? "text-[color:var(--gold)]" : ""}
              >
                {w}
              </motion.span>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 2.2, type: "spring", damping: 14, stiffness: 120 }}
            className="relative mt-10 h-28 w-28 overflow-hidden p-2 md:h-36 md:w-36"
          >
            <img src={cogniMark} alt="Cogni logo" className="h-full w-full object-contain brightness-0 invert" />
            <motion.span
              aria-hidden
              initial={{ x: "-150%" }}
              animate={{ x: "150%" }}
              transition={{ delay: 2.7, duration: 0.9, ease: "easeInOut" }}
              className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-brand-ink/90 to-transparent"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8"
          >
            <Button variant="ghost" onClick={finish} className="text-xs uppercase tracking-widest text-brand-ink hover:bg-brand-ink/10 hover:text-brand-ink">Skip</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

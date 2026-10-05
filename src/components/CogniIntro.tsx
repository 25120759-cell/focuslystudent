import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import cogniMark from "@/assets/cogni-mark.png";

const WORDS = ["This", "Is", "Cogni."];

/** Full-screen opening sequence: words appear one at a time, then the logo shines in. */
export function CogniIntro() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("cogni-intro-seen")) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => finish(), 4200);
    return () => clearTimeout(t);
  }, []);

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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-foreground text-background"
          onClick={finish}
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(700px_400px_at_50%_60%,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_70%)]" />
          <h1 className="relative flex flex-wrap justify-center gap-x-5 font-display text-6xl font-semibold tracking-tight md:text-8xl">
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
          </h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 2.2, type: "spring", damping: 14, stiffness: 120 }}
            className="relative mt-10 h-28 w-28 overflow-hidden rounded-[2rem] bg-background p-4 shadow-2xl md:h-36 md:w-36"
          >
            <img src={cogniMark} alt="Cogni logo" className="h-full w-full object-contain" />
            <motion.span
              aria-hidden
              initial={{ x: "-150%" }}
              animate={{ x: "150%" }}
              transition={{ delay: 2.7, duration: 0.9, ease: "easeInOut" }}
              className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-background/90 to-transparent"
            />
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1 }}
            onClick={finish}
            className="absolute bottom-8 text-xs uppercase tracking-widest hover:opacity-100"
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

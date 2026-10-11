import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowDown, ArrowRight, Check, FileText, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import cogniMark from "@/assets/cogni-mark.png";

const chapters = [
  { number: "01", label: "A little clarity.", title: "A big deadline.\nA small next step.", body: "Turn an assignment into a plan that fits around your classes. One manageable step at a time." },
  { number: "02", label: "A deeper understanding.", title: "Less re-reading.\nMore remembering.", body: "Bring your notes. Take away summaries, flashcards, and practice questions. Make the material your own." },
  { number: "03", label: "A quieter headspace.", title: "Just you.\nAnd the next 25 minutes.", body: "Put the rest aside. A calm focus timer helps you give one thing your full attention." },
];

export function CogniScrollStory() {
  const reduced = useReducedMotion();
  return <>
    <BrandScene reduced={Boolean(reduced)} />
    <StudyScenes reduced={Boolean(reduced)} />
  </>;
}

function BrandScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 32, restDelta: 0.001 });
  const titleY = useTransform(progress, [0, 0.7, 1], [0, -100, -180]);
  const titleOpacity = useTransform(progress, [0, 0.45, 0.8], [1, 1, 0]);
  const scale = useTransform(progress, [0, 0.8, 1], [1, 1.65, 1.9]);
  const markY = useTransform(progress, [0, 1], [0, -80]);
  const markOpacity = useTransform(progress, [0, 0.5, 1], [0.75, 0.9, 0.08]);
  const nextOpacity = useTransform(progress, [0, 0.6, 0.85, 1], [0, 0, 1, 1]);
  const nextY = useTransform(progress, [0.6, 1], [60, 0]);

  return (
    <section ref={ref} className={`cogni-brand-track ${reduced ? "cogni-static" : ""}`} aria-label="Cogni For Students">
      <div className="cogni-brand-stage">
        <motion.img src={cogniMark} alt="" aria-hidden className="cogni-hero-mark cogni-on-dark" style={reduced ? undefined : { scale, y: markY, opacity: markOpacity }} />
        <motion.div className="cogni-brand-copy" style={reduced ? undefined : { y: titleY, opacity: titleOpacity }}>
          <p className="mb-5 text-xs font-medium uppercase tracking-widest text-brand-ink/65">Part of the Cogni Suite</p>
          <h1 className="cogni-brand-title">Cogni<br /><span className="text-brand-ink/65">For Students.</span></h1>
          <p className="mx-auto mt-5 max-w-md text-base text-brand-ink/80 sm:text-lg">Think clearly. Study calmly.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-brand-ink text-brand-night hover:bg-brand-ink/90"><Link to="/signup">Start free <ArrowRight /></Link></Button>
            <Button asChild variant="link" className="text-brand-ink"><Link to="/plans">Explore plans <ArrowRight /></Link></Button>
          </div>
        </motion.div>
        {!reduced && <motion.div className="cogni-brand-next" style={{ opacity: nextOpacity, y: nextY }}>
          <p className="mb-4 text-xs uppercase tracking-widest text-brand-ink/60">Space to think</p>
          <h2 className="text-4xl font-semibold leading-tight sm:text-6xl">Everything you need.<br /><span className="text-brand-ink/60">Nothing in your way.</span></h2>
        </motion.div>}
        <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-3 text-xs text-brand-ink/60"><span>A calmer way to study</span><ArrowDown className="h-3.5 w-3.5" /></div>
      </div>
    </section>
  );
}

function StudyScenes({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 36, restDelta: 0.001 });
  if (reduced) return <section className="cogni-static-stories bg-card">{chapters.map((chapter, index) => <div className="cogni-static-chapter" key={chapter.number}>
    <ChapterCopy chapter={chapter} />
    <div className="cogni-demo-wrap"><StudyPreview index={index} /></div>
  </div>)}</section>;

  return <section ref={ref} className="cogni-study-track bg-card" aria-label="Plan, understand, focus">
    <div className="cogni-study-stage">
      {chapters.map((chapter, index) => <StudyChapter key={chapter.number} chapter={chapter} index={index} progress={progress} />)}
      <div className="cogni-chapter-progress" aria-hidden>{chapters.map((chapter, index) => <ChapterDot key={chapter.number} progress={progress} index={index} />)}</div>
    </div>
  </section>;
}

function ChapterDot({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const opacity = useTransform(progress, index === 0 ? [0, 0.24, 0.34] : index === 1 ? [0.24, 0.34, 0.61, 0.71] : [0.61, 0.71, 1], index === 0 ? [1, 1, 0.2] : index === 1 ? [0.2, 1, 1, 0.2] : [0.2, 1, 1]);
  return <motion.span className="h-1 w-8 rounded-full bg-primary" style={{ opacity }} />;
}

function StudyChapter({ chapter, index, progress }: { chapter: typeof chapters[number]; index: number; progress: MotionValue<number> }) {
  const range = index === 0 ? [0, 0.23, 0.34] : index === 1 ? [0.23, 0.34, 0.59, 0.71] : [0.59, 0.71, 1];
  const opacity = useTransform(progress, range, index === 0 ? [1, 1, 0] : index === 1 ? [0, 1, 1, 0] : [0, 1, 1]);
  const copyY = useTransform(progress, range, index === 0 ? [0, 0, -90] : index === 1 ? [90, 0, 0, -90] : [90, 0, 0]);
  const demoY = useTransform(progress, range, index === 0 ? [0, 0, -170] : index === 1 ? [170, 0, 0, -170] : [170, 0, 0]);
  const scale = useTransform(progress, range, index === 0 ? [1, 1, 0.88] : index === 1 ? [0.88, 1, 1, 0.88] : [0.88, 1, 1]);
  const rotateX = useTransform(progress, range, index === 0 ? [0, 0, 12] : index === 1 ? [-12, 0, 0, 12] : [-12, 0, 0]);
  const visibility = useTransform(opacity, (value) => value < 0.02 ? "hidden" : "visible");
  return <motion.div className="cogni-study-chapter" style={{ opacity, visibility }}>
    <motion.div style={{ y: copyY }}><ChapterCopy chapter={chapter} /></motion.div>
    <motion.div className="cogni-demo-wrap" style={{ y: demoY, scale, rotateX }}><StudyPreview index={index} /></motion.div>
  </motion.div>;
}

function ChapterCopy({ chapter }: { chapter: typeof chapters[number] }) {
  return <div className="cogni-chapter-copy">
    <p className="mb-4 flex items-center justify-center gap-3 text-xs font-medium text-muted-foreground"><span className="font-mono text-primary">{chapter.number}</span>{chapter.label}</p>
    <h2 className="whitespace-pre-line text-3xl font-semibold leading-[1.12] sm:text-5xl lg:text-6xl">{chapter.title}</h2>
    <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">{chapter.body}</p>
  </div>;
}

function StudyPreview({ index }: { index: number }) {
  return <div className={`cogni-product-window ${index === 2 ? "cogni-focus-window" : ""}`} aria-label={`${["Assignment plan", "Study notes", "Focus timer"][index]} preview`}>
    <div className="cogni-window-bar"><div className="flex items-center gap-2"><img src={cogniMark} alt="" className="h-5 w-5 object-contain" /><span className="font-display font-semibold">Cogni</span></div><span className="text-xs text-muted-foreground">{["Assignments", "AI Notes", "Focus"][index]}</span></div>
    {index === 0 ? <div className="cogni-preview-content">
      <div className="mb-5 flex items-start justify-between gap-3"><div><p className="mb-2 text-xs text-muted-foreground">Literature · Due Friday</p><h3 className="text-xl font-semibold">The essay, made manageable.</h3></div><FileText className="h-5 w-5 shrink-0 text-primary" /></div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 bg-primary" /></div>
      {[{ title: "Gather your sources", meta: "20 min", done: true }, { title: "Build your outline", meta: "25 min", done: false }, { title: "Write the first draft", meta: "45 min", done: false }].map((task) => <div key={task.title} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${task.done ? "bg-primary text-primary-foreground" : "border border-border"}`}>{task.done && <Check className="h-3 w-3" />}</span><span className={`flex-1 text-sm ${task.done ? "text-muted-foreground line-through" : ""}`}>{task.title}</span><span className="text-xs text-muted-foreground">{task.meta}</span></div>)}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" />One step closer.</p>
    </div> : index === 1 ? <div className="cogni-preview-content">
      <div className="mb-5 flex gap-5 border-b border-border pb-3 text-xs"><span className="font-semibold text-primary">Summary</span><span className="text-muted-foreground">Flashcards</span><span className="text-muted-foreground">Quiz</span></div>
      <p className="mb-2 text-xs text-muted-foreground">Biology · Chapter 4</p><h3 className="text-xl font-semibold">The big picture. In plain English.</h3>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Photosynthesis turns light energy into chemical energy. Plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.</p>
      <div className="mt-5 border-l-2 border-primary pl-4"><p className="text-xs font-semibold text-primary">Key takeaway</p><p className="mt-2 text-sm">Light in. Energy stored. Oxygen out.</p></div>
      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" />Saved for offline study</p>
    </div> : <div className="cogni-focus-content"><span className="text-xs uppercase tracking-widest text-muted-foreground">Build your outline</span><div className="cogni-timer-ring"><span className="font-display text-6xl font-light tabular-nums sm:text-7xl">25:00</span><span className="mt-2 text-xs text-muted-foreground">Time to focus</span></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Everything else can wait.</div></div>}
  </div>;
}
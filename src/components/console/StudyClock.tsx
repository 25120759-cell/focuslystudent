import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { alarm, chime } from "@/lib/audio";
import { logFocusSession } from "@/lib/classroom.functions";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function StudyClock() {
  const { state, dispatch } = useStore();
  const { timer, settings } = state;
  const [editing, setEditing] = useState(false);
  const [mins, setMins] = useState(settings.studyDuration);

  useEffect(() => {
    if (timer.timeLeft === 0 && !timer.isRunning) alarm();
  }, [timer.timeLeft, timer.isRunning]);

  const start = () => {
    chime(880, 0.2);
    dispatch({ type: "TIMER_SET", patch: { isRunning: true, isPaused: false, timeLeft: mins * 60 } });
  };
  const pause = () => dispatch({ type: "TIMER_SET", patch: { isPaused: true } });
  const resume = () => dispatch({ type: "TIMER_SET", patch: { isPaused: false } });
  const restart = () => dispatch({ type: "TIMER_SET", patch: { isPaused: false, timeLeft: mins * 60, isRunning: true } });
  const cancel = () => dispatch({ type: "TIMER_SET", patch: { isRunning: false, isPaused: false, timeLeft: mins * 60 } });
  const toggleFs = () => dispatch({ type: "TIMER_SET", patch: { isFullscreen: !timer.isFullscreen } });

  const content = (
    <div className="relative flex flex-col items-center justify-center gap-6 py-12">
      <div className="font-display text-8xl font-light tabular-nums tracking-tight md:text-9xl">
        {fmt(timer.timeLeft)}
      </div>

      {timer.isPaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 backdrop-blur-sm bg-background/60 rounded-3xl">
          <p className="font-display text-2xl italic text-muted-foreground">*Clock Paused*</p>
          <div className="flex gap-3">
            <button onClick={restart} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-accent">
              <RotateCcw className="h-4 w-4" /> Restart Clock
            </button>
            <button onClick={resume} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Play className="h-4 w-4" /> Resume Clock
            </button>
          </div>
        </div>
      )}

      {!timer.isPaused && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!timer.isRunning ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <button onClick={() => setMins(Math.max(1, mins - 5))} className="opacity-60 hover:opacity-100">−</button>
                <input
                  type="number"
                  value={mins}
                  onChange={(e) => setMins(Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 bg-transparent text-center"
                  onFocus={() => setEditing(true)}
                  onBlur={() => setEditing(false)}
                />
                <span className="text-muted-foreground">min</span>
                <button onClick={() => setMins(mins + 5)} className="opacity-60 hover:opacity-100">+</button>
              </div>
              <button onClick={start} className="flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Play className="h-4 w-4" /> Start
              </button>
            </>
          ) : (
            <>
              <button onClick={pause} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-accent">
                <Pause className="h-4 w-4" /> Pause
              </button>
              <button onClick={cancel} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" /> Cancel
              </button>
            </>
          )}
          <button onClick={toggleFs} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-accent">
            {timer.isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            Full-Screen
          </button>
        </div>
      )}
    </div>
  );

  if (timer.isFullscreen) {
    return (
      <div className="clock-fullscreen">
        <div className="w-full max-w-3xl">{content}</div>
      </div>
    );
  }
  return <div className="paper-raised p-6">{content}</div>;
}

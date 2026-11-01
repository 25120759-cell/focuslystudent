import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, X, Minus, Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { alarm, chime } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { logFocusSession } from "@/lib/classroom.functions";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function StudyClock() {
  const { state, dispatch } = useStore();
  const { timer, settings } = state;
  const [mins, setMins] = useState(settings.studyDuration);

  const logFocus = useServerFn(logFocusSession);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (timer.timeLeft === 0 && !timer.isRunning) alarm();
  }, [timer.timeLeft, timer.isRunning]);

  // Report completed focus sessions so teacher-side insights receive study data.
  useEffect(() => {
    if (timer.timeLeft === 0) {
      if (loggedRef.current) return;
      loggedRef.current = true;
      const minutes = Math.max(1, Math.round(mins));
      logFocus({ data: { minutes, distractions: 0 } }).catch(() => {});
    } else {
      loggedRef.current = false;
    }
  }, [timer.timeLeft, mins, logFocus]);

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
    <div className="focus-stage">
      <div className="flex w-full max-w-lg items-center justify-between">
        <p className="workspace-kicker">Focus session</p>
        <Button variant="ghost" size="icon" onClick={toggleFs} aria-label={timer.isFullscreen ? "Exit full screen" : "Full screen"} title={timer.isFullscreen ? "Exit full screen" : "Full screen"}>
          {timer.isFullscreen ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </div>
      <div className="focus-dial" data-running={timer.isRunning && !timer.isPaused}>
        <span className="workspace-kicker">{timer.isPaused ? "Paused" : timer.isRunning ? "In focus" : "Ready when you are"}</span>
        <div className="focus-digits" role="timer" aria-label="Time remaining">{fmt(timer.isRunning ? timer.timeLeft : mins * 60)}</div>
        <span className="text-xs text-muted-foreground">{mins} minute session</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!timer.isRunning ? (
          <>
            <div className="flex h-10 items-center rounded-md border border-border bg-card">
              <Button variant="ghost" size="icon" onClick={() => setMins(Math.max(1, mins - 5))} aria-label="Decrease duration" title="Decrease duration"><Minus /></Button>
              <input aria-label="Session minutes" type="number" min="1" value={mins} onChange={(e) => setMins(Math.max(1, Number(e.target.value) || 1))} className="w-12 bg-transparent text-center text-sm" />
              <span className="text-xs text-muted-foreground">min</span>
              <Button variant="ghost" size="icon" onClick={() => setMins(mins + 5)} aria-label="Increase duration" title="Increase duration"><Plus /></Button>
            </div>
            <Button onClick={start} className="h-10 px-6"><Play /> Start session</Button>
          </>
        ) : timer.isPaused ? (
          <>
            <Button variant="outline" onClick={restart}><RotateCcw /> Restart</Button>
            <Button onClick={resume}><Play /> Resume</Button>
            <Button variant="ghost" size="icon" onClick={cancel} aria-label="Cancel session" title="Cancel session"><X /></Button>
          </>
        ) : (
          <>
            <Button onClick={pause}><Pause /> Pause</Button>
            <Button variant="outline" onClick={cancel}><X /> Cancel</Button>
          </>
        )}
      </div>
    </div>
  );

  if (timer.isFullscreen) {
    return (
      <div className="clock-fullscreen">
        <div className="w-full max-w-3xl">{content}</div>
      </div>
    );
  }
  return <section className="border-b border-border">{content}</section>;
}

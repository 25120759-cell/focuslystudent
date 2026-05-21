import { Upload, Camera } from "lucide-react";
import { useStore } from "@/lib/store";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PALETTE: Record<string, string> = {
  Math: "bg-tt-blue",
  Science: "bg-tt-teal",
  Mandarin: "bg-tt-purple",
  English: "bg-tt-peach",
  "Host Country": "bg-tt-purple",
  Malay: "bg-tt-blue",
  Music: "bg-tt-peach",
  Design: "bg-tt-teal",
  Leadership: "bg-tt-purple",
  Break: "bg-tt-break",
  "I&S": "bg-tt-peach",
  Swimming: "bg-tt-blue",
  "P.E.": "bg-tt-teal",
  "Study Hall": "bg-tt-purple",
  Explorations: "bg-tt-peach",
};

export function Timetable() {
  const { state, dispatch } = useStore();
  if (!state.timetable.hasData) {
    return (
      <div className="rounded-3xl glass p-16 text-center">
        <p className="font-display text-3xl italic text-muted-foreground mb-8">*No Timetable*</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => dispatch({ type: "UPLOAD_TIMETABLE" })}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Upload className="h-4 w-4" /> Upload file
          </button>
          <button
            onClick={() => dispatch({ type: "UPLOAD_TIMETABLE" })}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium hover:bg-accent"
          >
            <Camera className="h-4 w-4" /> Take Picture
          </button>
        </div>
      </div>
    );
  }

  // 5 columns (days), 5 rows of periods. Build period rows from schedule.
  const rows = 5;
  return (
    <div className="rounded-3xl glass p-6">
      <div className="grid grid-cols-5 gap-3">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1">{d}</div>
        ))}
        {Array.from({ length: rows }).map((_, r) =>
          DAYS.map((d) => {
            const subj = state.timetable.schedule[d]?.[r] ?? "";
            const color = PALETTE[subj] ?? "bg-muted";
            return (
              <div
                key={`${d}-${r}`}
                className={`${color} rounded-2xl p-4 min-h-[80px] flex items-center justify-center text-center text-sm font-medium text-foreground/90`}
              >
                {subj}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

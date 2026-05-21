import { useStore } from "@/lib/store";

export function FilesView() {
  const { state } = useStore();
  const plans = Object.values(state.actionPlans);
  return (
    <div className="space-y-6">
      {plans.map((plan) => (
        <div key={plan.id} className="rounded-3xl glass p-6">
          <h3 className="font-display text-2xl mb-4">{plan.title}</h3>
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-2">
            <div className="col-span-5">Action to be completed</div>
            <div className="col-span-3">Date and Time</div>
            <div className="col-span-4">Progress</div>
          </div>
          <div className="divide-y divide-border">
            {plan.steps.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-3 text-sm">
                <div className="col-span-5">{s.action}</div>
                <div className="col-span-3 whitespace-pre-line text-xs text-muted-foreground">{s.date}</div>
                <div className="col-span-4 whitespace-pre-line text-xs">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      s.status === "Completed" ? "bg-tt-break text-foreground" : "bg-tt-peach text-foreground"
                    }`}
                  >
                    {s.status}
                  </span>
                  <div className="mt-1 text-muted-foreground">{s.progress.split("\n").slice(1).join("\n")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {plans.length === 0 && (
        <div className="rounded-3xl glass p-12 text-center text-muted-foreground italic">No files yet. Ask the AI to plan something for you.</div>
      )}
    </div>
  );
}

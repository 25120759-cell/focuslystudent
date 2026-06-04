export function FocuslyAILogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="fal-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(45 92% 58%)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 L19 13 L30 16 L19 19 L16 30 L13 19 L2 16 L13 13 Z"
        fill="url(#fal-g)"
      />
      <circle cx="16" cy="16" r="2.4" fill="white" opacity="0.95" />
    </svg>
  );
}

export function FocuslyAIWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display font-semibold tracking-tight ${className}`}>
      <FocuslyAILogo className="h-4 w-4" />
      <span>
        Focusly<span className="bg-gradient-to-r from-primary to-[color:var(--gold)] bg-clip-text text-transparent">·AI</span>
      </span>
    </span>
  );
}

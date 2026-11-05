# Project rules
- Keep landing scroll storytelling in a dedicated browser-safe component using Framer Motion motion values, native scrolling, and a static reduced-motion fallback; this keeps motion independent of app workflows and avoids scroll hijacking.
- Keep study workspace styling scoped to workspace classes and use unframed page sections with task-specific layouts; this lets the app evolve without changing landing storytelling or editor behavior.
- Public conversion and support flows use PublicPage for shared editorial headings and footer, keeping task-specific bodies and native scrolling separate from the landing story.

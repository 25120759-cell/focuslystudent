import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Cogni For Students — Your study space" },
    { name: "description", content: "A calmer space to plan assignments, focus, and study with Cogni For Students." },
    { property: "og:title", content: "Cogni For Students — Your study space" },
    { property: "og:description", content: "Plan, focus, and learn in your own Cogni study space." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
    throw redirect({ to: "/landing" });
  },
  component: () => null,
});

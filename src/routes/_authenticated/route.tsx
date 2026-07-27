import { RouteError } from "@/components/app/States";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  errorComponent: RouteError,
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/landing" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});

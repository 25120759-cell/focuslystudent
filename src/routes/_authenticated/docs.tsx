import { RouteError } from "@/components/app/States";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/docs")({
  errorComponent: RouteError,
  component: () => <Outlet />,
});

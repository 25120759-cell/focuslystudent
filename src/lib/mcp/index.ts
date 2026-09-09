import { defineMcp, auth } from "@lovable.dev/mcp-js";
import listAssignments from "./tools/list-assignments";
import createAssignment from "./tools/create-assignment";
import updateAssignmentStatus from "./tools/update-assignment-status";
import listDocs from "./tools/list-docs";
import getDoc from "./tools/get-doc";
import listClasses from "./tools/list-classes";

const SUPABASE_URL =
  (import.meta.env?.['VITE_SUPABASE_URL'] as string | undefined) ??
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.['SUPABASE_URL'] ??
  "";

export default defineMcp({
  name: "cogni-for-students",
  title: "Cogni For Students",
  version: "1.0.0",
  instructions:
    "Tools for a single signed-in student in Cogni For Students (part of the Cogni Suite). Every tool acts only on the authenticated student's own data: assignments, documents and enrolled classes. Never assume access to another person's data. Dates are ISO 8601.",
  auth: auth.oauth.issuer({
    issuer: `${SUPABASE_URL}/auth/v1`,
    jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    acceptedAudiences: ["authenticated"],
  }),
  tools: [listAssignments, createAssignment, updateAssignmentStatus, listDocs, getDoc, listClasses],
});

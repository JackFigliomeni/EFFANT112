import type { ToolSchema } from "./schema";

// The habit-tracker example from the roadmap doc — used to prove the Phase 1
// engine end-to-end (input saves to Supabase, view reads from Supabase,
// action button works) before any builder UI exists.
export const habitTrackerSchema: ToolSchema = {
  blocks: [
    { type: "input", id: "did_it", label: "Did you do it today?", kind: "boolean" },
    { type: "table", id: "log", fields: ["did_it", "date"] },
    { type: "view", id: "streak_view", source: "log", display: "calendar" },
    { type: "action", id: "mark_done", does: "add_record", target: "log" },
    { type: "rule", id: "remind", when: "not marked by 8pm", then: "notify" },
  ],
};

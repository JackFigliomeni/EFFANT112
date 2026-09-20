import { useState } from "react";
import {
  ACTION_DOES,
  INPUT_KINDS,
  VIEW_DISPLAYS,
  type ActionDoes,
  type Block,
  type InputKind,
  type ViewDisplay,
} from "@/lib/schema";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

/** Renders the right edit form for one block, based on its type. */
export function BlockEditor({
  block,
  onChange,
  onRemove,
  toolId,
  plan,
}: {
  block: Block;
  onChange: (next: Block) => void;
  onRemove: () => void;
  // Only meaningful for "automation" blocks — the tool needs a saved id
  // before it can be test-run, and free vs. Pro changes what happens next.
  toolId?: string | null;
  plan?: Plan;
}) {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function runTest() {
    if (block.type !== "automation" || !toolId) return;
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch(`/api/tools/${toolId}/automations/${block.id}/test-run`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setTestStatus(body.error ?? "Test run failed.");
        return;
      }
      setTestStatus("Generated a new record — check the live preview.");
      // The server only tracks testRunsUsed for free plan (see the test-run
      // route) — mirror that here so the count shown doesn't drift.
      if (plan === "free") {
        onChange({ ...block, testRunsUsed: block.testRunsUsed + 1 });
      }
    } catch {
      setTestStatus("Couldn't reach the server.");
    } finally {
      setTesting(false);
    }
  }
  const fieldClass =
    "w-full border-b border-border bg-transparent px-0 py-1.5 text-sm outline-none transition-colors focus:border-foreground";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="control-kicker">{block.type}</span>
        <button onClick={onRemove} className="text-xs text-destructive hover:underline">
          Remove
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Block id
        <input
          className={fieldClass}
          value={block.id}
          onChange={(e) => onChange({ ...block, id: e.target.value } as Block)}
        />
      </label>

      {block.type === "input" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Label
            <input
              className={fieldClass}
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Kind
            <select
              className={fieldClass}
              value={block.kind}
              onChange={(e) => onChange({ ...block, kind: e.target.value as InputKind })}
            >
              {INPUT_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          {(block.kind === "select" || block.kind === "multiselect") && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Options (comma separated)
              <input
                className={fieldClass}
                value={(block.options ?? []).join(", ")}
                onChange={(e) =>
                  onChange({
                    ...block,
                    options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                  })
                }
              />
            </label>
          )}
        </>
      )}

      {block.type === "table" && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Fields (comma separated)
          <input
            className={fieldClass}
            value={block.fields.join(", ")}
            onChange={(e) =>
              onChange({ ...block, fields: e.target.value.split(",").map((f) => f.trim()).filter(Boolean) })
            }
          />
        </label>
      )}

      {block.type === "view" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Source table id
            <input
              className={fieldClass}
              value={block.source}
              onChange={(e) => onChange({ ...block, source: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Display
            <select
              className={fieldClass}
              value={block.display}
              onChange={(e) => onChange({ ...block, display: e.target.value as ViewDisplay })}
            >
              {VIEW_DISPLAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          {(block.display === "sum" || block.display === "average" || block.display === "chart") && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Field to aggregate
              <input
                className={fieldClass}
                value={block.field ?? ""}
                onChange={(e) => onChange({ ...block, field: e.target.value })}
                placeholder="a numeric field on the source table"
              />
            </label>
          )}
        </>
      )}

      {block.type === "action" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Does
            <select
              className={fieldClass}
              value={block.does}
              onChange={(e) => onChange({ ...block, does: e.target.value as ActionDoes })}
            >
              {ACTION_DOES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Target table id
            <input
              className={fieldClass}
              value={block.target}
              onChange={(e) => onChange({ ...block, target: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Button label (optional)
            <input
              className={fieldClass}
              value={block.label ?? ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </label>
          {block.does === "update_record" && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Boolean field to toggle
              <input
                className={fieldClass}
                value={block.field ?? ""}
                onChange={(e) => onChange({ ...block, field: e.target.value })}
              />
            </label>
          )}
          {(block.does === "update_record" || block.does === "delete_record") && (
            <p className="text-xs text-muted-foreground">
              Shown as a per-row button on any view of this table, not a standalone button.
            </p>
          )}
        </>
      )}

      {block.type === "rule" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            When
            <input
              className={fieldClass}
              value={block.when}
              onChange={(e) => onChange({ ...block, when: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Then
            <input
              className={fieldClass}
              value={block.then}
              onChange={(e) => onChange({ ...block, then: e.target.value })}
            />
          </label>
        </>
      )}

      {block.type === "automation" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Target table id
            <input
              className={fieldClass}
              value={block.target}
              onChange={(e) => onChange({ ...block, target: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Prompt (what Claude should generate each run)
            <textarea
              className={fieldClass}
              rows={3}
              value={block.prompt}
              onChange={(e) => onChange({ ...block, prompt: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={block.useWebSearch}
              onChange={(e) => onChange({ ...block, useWebSearch: e.target.checked })}
            />
            Use real web search (e.g. to find an actual article/recipe link)
          </label>
          {plan === "pro" ? (
            <p className="text-xs text-muted-foreground">
              Runs automatically once a day, inserting one new record into the target table.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Free plan: doesn&rsquo;t run automatically — use &ldquo;Test run&rdquo; to try it (
              {Math.max(0, PLAN_LIMITS.free.automationTestRuns - block.testRunsUsed)} of{" "}
              {PLAN_LIMITS.free.automationTestRuns} left). Upgrade to Pro for it to run every day on
              its own.
            </p>
          )}

          {toolId ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runTest}
                disabled={testing || (plan !== "pro" && block.testRunsUsed >= PLAN_LIMITS.free.automationTestRuns)}
                className="w-fit rounded-full border border-border bg-card/65 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-card disabled:opacity-50"
              >
                {testing ? "Running…" : "Test run"}
              </button>
              {testStatus && <span className="text-xs text-muted-foreground">{testStatus}</span>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Save the tool first to test this.</p>
          )}
        </>
      )}
    </div>
  );
}

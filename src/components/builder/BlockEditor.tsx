import {
  ACTION_DOES,
  INPUT_KINDS,
  VIEW_DISPLAYS,
  type ActionDoes,
  type Block,
  type InputKind,
  type ViewDisplay,
} from "@/lib/schema";

/** Renders the right edit form for one block, based on its type. */
export function BlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: Block;
  onChange: (next: Block) => void;
  onRemove: () => void;
}) {
  const fieldClass =
    "rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          {block.type}
        </span>
        <button onClick={onRemove} className="text-xs text-red-600 hover:underline">
          Remove
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        Block id
        <input
          className={fieldClass}
          value={block.id}
          onChange={(e) => onChange({ ...block, id: e.target.value } as Block)}
        />
      </label>

      {block.type === "input" && (
        <>
          <label className="flex flex-col gap-1 text-xs">
            Label
            <input
              className={fieldClass}
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
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
            <label className="flex flex-col gap-1 text-xs">
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
        <label className="flex flex-col gap-1 text-xs">
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
          <label className="flex flex-col gap-1 text-xs">
            Source table id
            <input
              className={fieldClass}
              value={block.source}
              onChange={(e) => onChange({ ...block, source: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
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
            <label className="flex flex-col gap-1 text-xs">
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
          <label className="flex flex-col gap-1 text-xs">
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
          <label className="flex flex-col gap-1 text-xs">
            Target table id
            <input
              className={fieldClass}
              value={block.target}
              onChange={(e) => onChange({ ...block, target: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Button label (optional)
            <input
              className={fieldClass}
              value={block.label ?? ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </label>
          {block.does === "update_record" && (
            <label className="flex flex-col gap-1 text-xs">
              Boolean field to toggle
              <input
                className={fieldClass}
                value={block.field ?? ""}
                onChange={(e) => onChange({ ...block, field: e.target.value })}
              />
            </label>
          )}
          {(block.does === "update_record" || block.does === "delete_record") && (
            <p className="text-xs text-black/40 dark:text-white/40">
              Shown as a per-row button on any view of this table, not a standalone button.
            </p>
          )}
        </>
      )}

      {block.type === "rule" && (
        <>
          <label className="flex flex-col gap-1 text-xs">
            When
            <input
              className={fieldClass}
              value={block.when}
              onChange={(e) => onChange({ ...block, when: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
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
          <label className="flex flex-col gap-1 text-xs">
            Target table id
            <input
              className={fieldClass}
              value={block.target}
              onChange={(e) => onChange({ ...block, target: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Prompt (what Claude should generate each run)
            <textarea
              className={fieldClass}
              rows={3}
              value={block.prompt}
              onChange={(e) => onChange({ ...block, prompt: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={block.useWebSearch}
              onChange={(e) => onChange({ ...block, useWebSearch: e.target.checked })}
            />
            Use real web search (e.g. to find an actual article/recipe link)
          </label>
          <p className="text-xs text-black/40 dark:text-white/40">
            Runs once a day for every tool that has this block, inserting one new record into the
            target table — no button, no manual trigger.
          </p>
        </>
      )}
    </div>
  );
}

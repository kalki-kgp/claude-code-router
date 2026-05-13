import { Pencil, Trash2, Wand2 } from "lucide-react";
import type { Transformer } from "@/types";

interface TransformerListProps {
  transformers: Transformer[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function TransformerList({ transformers, onEdit, onRemove }: TransformerListProps) {
  if (!transformers || !Array.isArray(transformers) || transformers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
        <Wand2 className="h-5 w-5 text-text-dim" />
        <div className="text-data text-text-mid">No custom transformers</div>
        <div className="text-[11.5px] text-text-dim">
          Built-in transformers cover most providers — add one only if a plugin needs it.
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline">
      {transformers.map((transformer, index) => {
        if (!transformer) {
          return (
            <div key={index} className="px-5 py-3.5">
              <div className="text-[12.5px] text-coral">Invalid transformer data</div>
            </div>
          );
        }

        const path = transformer.path || transformer.name || "unnamed";
        const options = transformer.options || {};
        const optionKeys = Object.keys(options);

        return (
          <div key={index} className="group flex items-start justify-between gap-3 px-5 py-3 transition hover:bg-[oklch(1_0_0_/_1.5%)]">
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[12px] text-text-strong">{path}</div>
              {optionKeys.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {optionKeys.map((key) => (
                    <span key={key} className="chip">
                      <span className="text-text-dim">{key}</span>
                      <span className="text-text-mid">=</span>
                      <span>{String(options[key])}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-text-dim">no options</div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <IconButton onClick={() => onEdit(index)}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton variant="danger" onClick={() => onRemove(index)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-text-mid transition ${
        variant === "danger"
          ? "hover:bg-[oklch(0.30_0.10_25_/_30%)] hover:text-coral"
          : "hover:bg-surface-elevated hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

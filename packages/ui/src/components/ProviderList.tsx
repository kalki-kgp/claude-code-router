import { Pencil, Trash2, Plug } from "lucide-react";
import type { Provider } from "@/types";

interface ProviderListProps {
  providers: Provider[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function ProviderList({ providers, onEdit, onRemove }: ProviderListProps) {
  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
        <Plug className="h-5 w-5 text-text-dim" />
        <div className="text-data text-text-mid">No providers configured</div>
        <div className="text-[11.5px] text-text-dim">
          Add a provider above to define where requests are sent.
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline">
      {providers.map((provider, index) => {
        if (!provider) {
          return (
            <div key={index} className="px-5 py-4">
              <div className="text-[12.5px] text-coral">Invalid provider data</div>
              <div className="mt-2 flex justify-end gap-1">
                <IconButton onClick={() => onEdit(index)} disabled>
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton variant="danger" onClick={() => onRemove(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          );
        }

        const providerName = provider.name || "unnamed";
        const apiBaseUrl = provider.api_base_url || "no API URL";
        const models = Array.isArray(provider.models) ? provider.models : [];
        const transformerCount = Array.isArray(provider.transformer?.use)
          ? provider.transformer!.use.length
          : 0;
        const isCodex = providerName.toLowerCase() === "codex";

        return (
          <div key={index} className="group px-5 py-4 transition hover:bg-[oklch(1_0_0_/_1.5%)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${isCodex ? "" : "is-off"}`} />
                  <span className="text-[13px] font-medium text-text-strong">{providerName}</span>
                  {isCodex && <span className="chip is-mint">primary</span>}
                  {transformerCount > 0 && (
                    <span className="chip">{transformerCount} transformer{transformerCount > 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-text-dim">{apiBaseUrl}</div>

                {models.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {models.slice(0, 14).map((model, mi) => (
                      <span key={mi} className="chip">
                        {model || "unknown"}
                      </span>
                    ))}
                    {models.length > 14 && (
                      <span className="chip">+{models.length - 14}</span>
                    )}
                  </div>
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
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-text-mid transition disabled:opacity-40 ${
        variant === "danger"
          ? "hover:bg-[oklch(0.30_0.10_25_/_30%)] hover:text-coral"
          : "hover:bg-surface-elevated hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

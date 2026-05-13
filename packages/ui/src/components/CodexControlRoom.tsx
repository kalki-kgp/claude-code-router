import { useEffect, useMemo, useState } from "react";
import { Power, KeyRound, Sparkles, ArrowRight } from "lucide-react";
import { useConfig } from "./ConfigProvider";
import type { Config, RouterConfig } from "@/types";

/* ─────────────────────────────────────────────────────────────
   CodexControlRoom — the hero of the dashboard.
   Reads the codex-mode toggle, exposes presets, and shows
   the active routing fingerprint as one continuous chip strip.
   ───────────────────────────────────────────────────────────── */

type PresetId = "max" | "balanced" | "cheap";

const codexModels = [
  "gpt-5.5",
  "gpt-5.5-low",
  "gpt-5.5-high",
  "gpt-5.5-xhigh",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-mini-low",
  "gpt-5.3-codex",
  "gpt-5.2",
];

const presets: Record<
  PresetId,
  {
    name: string;
    tagline: string;
    defaultModel: string;
    backgroundModel: string;
    thinkModel: string;
    longContextModel: string;
    threshold: number;
  }
> = {
  max: {
    name: "Max Power",
    tagline: "Frontier reasoning everywhere.",
    defaultModel: "gpt-5.5-high",
    backgroundModel: "gpt-5.4-mini-low",
    thinkModel: "gpt-5.5-xhigh",
    longContextModel: "gpt-5.5",
    threshold: 80000,
  },
  balanced: {
    name: "Balanced",
    tagline: "Daily driver, cheap background.",
    defaultModel: "gpt-5.5",
    backgroundModel: "gpt-5.4-mini-low",
    thinkModel: "gpt-5.5-high",
    longContextModel: "gpt-5.5",
    threshold: 80000,
  },
  cheap: {
    name: "Spare Quota",
    tagline: "Stretch a tight Codex window.",
    defaultModel: "gpt-5.4-mini",
    backgroundModel: "gpt-5.4-mini-low",
    thinkModel: "gpt-5.5",
    longContextModel: "gpt-5.4-mini",
    threshold: 120000,
  },
};

const toRoute = (m: string) => `codex,${m}`;
const fromRoute = (r?: string) => r?.split(",")[1] || "—";

function ensureCodexProvider(config: Config): Config {
  const providers = Array.isArray(config.Providers) ? [...config.Providers] : [];
  const idx = providers.findIndex((p) => p?.name === "codex");
  const fallback = {
    name: "codex",
    api_base_url: "https://chatgpt.com/backend-api/codex",
    api_key: "placeholder",
    models: codexModels,
    transformer: { use: ["codex"] },
  };
  if (idx >= 0) {
    const existing = providers[idx];
    providers[idx] = {
      ...existing,
      api_base_url: existing.api_base_url || fallback.api_base_url,
      api_key: existing.api_key || "placeholder",
      models: Array.from(new Set([...(existing.models || []), ...codexModels])),
      transformer: existing.transformer || fallback.transformer,
    };
  } else {
    providers.push(fallback);
  }
  return { ...config, Providers: providers };
}

function applyPresetToConfig(config: Config, presetId: PresetId): Config {
  const preset = presets[presetId];
  const nextConfig = ensureCodexProvider(config);
  const current = nextConfig.Router || ({} as RouterConfig);
  return {
    ...nextConfig,
    Router: {
      ...current,
      default: toRoute(preset.defaultModel),
      background: toRoute(preset.backgroundModel),
      think: toRoute(preset.thinkModel),
      longContext: toRoute(preset.longContextModel),
      webSearch: current.webSearch || toRoute(preset.defaultModel),
      image: current.image || toRoute(preset.defaultModel),
      longContextThreshold: preset.threshold,
    },
  };
}

function detectCurrentPreset(config: Config | null): PresetId | null {
  if (!config?.Router) return null;
  const r = config.Router;
  for (const [id, p] of Object.entries(presets)) {
    if (
      r.default === toRoute(p.defaultModel) &&
      r.background === toRoute(p.backgroundModel) &&
      r.think === toRoute(p.thinkModel) &&
      r.longContext === toRoute(p.longContextModel)
    ) {
      return id as PresetId;
    }
  }
  return null;
}

export function CodexControlRoom() {
  const { config, setConfig } = useConfig();
  const [codexActive, setCodexActive] = useState<boolean | null>(null);
  const [codexSince, setCodexSince] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/ui/codex-mode")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCodexActive(Boolean(data?.active));
        setCodexSince(data?.since || null);
      })
      .catch(() => {
        if (!cancelled) setCodexActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCodexMode = async () => {
    if (codexActive === null || toggleBusy) return;
    setToggleBusy(true);
    try {
      const endpoint = codexActive ? "/ui/codex-mode/stop" : "/ui/codex-mode/start";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      setCodexActive(Boolean(data?.active));
      setCodexSince(data?.since || null);
    } catch {
      /* keep prior state */
    } finally {
      setToggleBusy(false);
    }
  };

  const activePreset = useMemo(() => detectCurrentPreset(config), [config]);

  const onApplyPreset = (id: PresetId) => {
    if (!config) return;
    setConfig(applyPresetToConfig(config, id));
  };

  const isOn = codexActive === true;
  const loading = codexActive === null;

  return (
    <section className={`panel relative overflow-hidden ${isOn ? "hero-armed" : ""}`}>
      <div className="panel-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left: status + switch */}
        <div className="flex flex-col gap-6 p-6 md:border-r md:border-hairline">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${isOn ? "" : "is-off"}`} />
            <span className="label-micro">Codex Routing</span>
            <span className="label-micro text-text-dim">·</span>
            <span className="label-micro" style={{ color: isOn ? "var(--mint)" : "var(--text-dim)" }}>
              {loading ? "polling…" : isOn ? "armed" : "standby"}
            </span>
            {isOn && codexSince && (
              <>
                <span className="label-micro text-text-dim">·</span>
                <span className="label-micro text-text-dim">
                  since{" "}
                  {new Date(codexSince).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="space-y-3">
              <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.02em] text-text-strong">
                {isOn ? (
                  <>
                    Codex mode is <em className="not-italic text-mint">on</em>.
                  </>
                ) : (
                  <>
                    Codex mode is <em className="not-italic text-text-mid">off</em>.
                  </>
                )}
              </h1>
              <p className="max-w-md text-[13.5px] leading-relaxed text-text-mid">
                {isOn
                  ? "New `claude` shell sessions route through CCR and hit your ChatGPT Codex subscription. Stop to fall back to Anthropic."
                  : "New `claude` shell sessions go to Anthropic directly. Press Start to route them through CCR → Codex."}
              </p>
            </div>

            <button
              onClick={toggleCodexMode}
              disabled={loading || toggleBusy}
              aria-label={isOn ? "Stop Codex routing" : "Start Codex routing"}
              className="group flex shrink-0 items-center gap-3 disabled:opacity-50"
            >
              <span className={`text-data text-[11px] tracking-[0.2em] uppercase ${isOn ? "text-coral" : "text-mint"}`}>
                {toggleBusy ? "…" : isOn ? "Stop" : "Start"}
              </span>
              <span className={`switch-track ${isOn ? "is-on" : ""}`}>
                <span className="switch-knob flex items-center justify-center">
                  <Power className="h-3 w-3" style={{ color: isOn ? "oklch(0.13 0.006 250)" : "oklch(0.30 0 0)" }} />
                </span>
              </span>
            </button>
          </div>

          <div className="hairline" />

          <FingerprintRow config={config} />
        </div>

        {/* Right: presets + auth */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-text-dim" />
              <span className="label-micro">Presets</span>
            </div>
            {activePreset && (
              <span className="text-data text-[10.5px] tracking-[0.15em] uppercase text-mint">
                {presets[activePreset].name} · live
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 px-6 pb-5">
            {(Object.keys(presets) as PresetId[]).map((id) => (
              <PresetCard
                key={id}
                preset={presets[id]}
                active={activePreset === id}
                onApply={() => onApplyPreset(id)}
              />
            ))}
          </div>

          <div className="hairline mx-6" />

          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline-strong bg-surface-sunken">
              <KeyRound className="h-3.5 w-3.5 text-text-mid" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[12.5px] font-medium text-text-strong">Codex CLI mirror</span>
                <span className="chip is-mint">active</span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-text-dim">
                ~/.codex/auth.json · ChatGPT token
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FingerprintRow({ config }: { config: Config | null }) {
  const router = config?.Router;
  const lanes: { key: string; label: string; value: string }[] = [
    { key: "default", label: "default", value: fromRoute(router?.default) },
    { key: "background", label: "background", value: fromRoute(router?.background) },
    { key: "think", label: "think", value: fromRoute(router?.think) },
    { key: "longContext", label: "long ctx", value: fromRoute(router?.longContext) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11.5px]">
      {lanes.map((lane, i) => (
        <span key={lane.key} className="flex items-center gap-1.5">
          <span className="text-text-dim">{lane.label}</span>
          <span className="text-text-strong">{lane.value}</span>
          {i < lanes.length - 1 && <span className="text-text-dim">·</span>}
        </span>
      ))}
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onApply,
}: {
  preset: {
    name: string;
    tagline: string;
    defaultModel: string;
    backgroundModel: string;
    thinkModel: string;
  };
  active: boolean;
  onApply: () => void;
}) {
  return (
    <button
      onClick={onApply}
      className={`group flex items-center justify-between gap-3 rounded-md border px-3.5 py-3 text-left transition ${
        active
          ? "border-mint-dim bg-[oklch(0.30_0.10_152_/_22%)]"
          : "border-hairline bg-surface-sunken hover:border-hairline-strong hover:bg-surface-elevated"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-text-strong">{preset.name}</span>
          {active && <span className="chip is-mint">applied</span>}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-text-mid">{preset.tagline}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="chip">{preset.defaultModel}</span>
          <span className="chip">bg: {preset.backgroundModel}</span>
          <span className="chip">think: {preset.thinkModel}</span>
        </div>
      </div>
      <ArrowRight
        className={`h-4 w-4 shrink-0 transition ${
          active ? "text-mint" : "text-text-dim group-hover:text-text-mid group-hover:translate-x-0.5"
        }`}
      />
    </button>
  );
}

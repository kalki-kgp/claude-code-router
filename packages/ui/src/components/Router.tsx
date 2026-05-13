import { useTranslation } from "react-i18next";
import { Route, Compass, MoonStar, Lightbulb, ScrollText, Globe2, ImageIcon } from "lucide-react";
import { useConfig } from "./ConfigProvider";
import { Combobox } from "./ui/combobox";

const LANE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; hint: string }
> = {
  default: { icon: Compass, hint: "Used for general traffic when no other lane matches." },
  background: { icon: MoonStar, hint: "Title generation, subagent calls, anything cheap." },
  think: { icon: Lightbulb, hint: "Reasoning-heavy plans and code surgery." },
  longContext: { icon: ScrollText, hint: "Engaged when input tokens exceed the threshold." },
  webSearch: { icon: Globe2, hint: "Requires the model to support web tools." },
  image: { icon: ImageIcon, hint: "Image-aware lane (beta)." },
};

export function Router() {
  const { t } = useTranslation();
  const { config, setConfig } = useConfig();

  if (!config) {
    return (
      <section className="panel p-5">
        <PanelHeader />
        <div className="mt-4 text-data text-text-mid">Loading routing matrix…</div>
      </section>
    );
  }

  const routerConfig = config.Router || {
    default: "",
    background: "",
    think: "",
    longContext: "",
    longContextThreshold: 60000,
    webSearch: "",
    image: "",
  };

  const handleRouterChange = (field: string, value: string | number) => {
    const currentRouter = config.Router || {};
    setConfig({ ...config, Router: { ...currentRouter, [field]: value } });
  };

  const handleForceUseImageAgentChange = (value: boolean) => {
    setConfig({ ...config, forceUseImageAgent: value });
  };

  const providers = Array.isArray(config.Providers) ? config.Providers : [];
  const modelOptions = providers.flatMap((provider) => {
    if (!provider) return [];
    const models = Array.isArray(provider.models) ? provider.models : [];
    const providerName = provider.name || "unknown";
    return models.map((model) => ({
      value: `${providerName},${model || "unknown"}`,
      label: `${providerName} · ${model || "unknown"}`,
    }));
  });

  const lanes: { key: keyof typeof LANE_META; value: string }[] = [
    { key: "default", value: routerConfig.default || "" },
    { key: "background", value: routerConfig.background || "" },
    { key: "think", value: routerConfig.think || "" },
    { key: "longContext", value: routerConfig.longContext || "" },
    { key: "webSearch", value: routerConfig.webSearch || "" },
    { key: "image", value: routerConfig.image || "" },
  ];

  return (
    <section className="panel">
      <PanelHeader />

      <div className="divide-y divide-hairline">
        {lanes.map((lane) => {
          const Meta = LANE_META[lane.key];
          const Icon = Meta?.icon;
          const label = t(`router.${lane.key}`, lane.key);
          return (
            <div key={lane.key} className="grid grid-cols-[210px_1fr] items-center gap-4 px-5 py-3.5">
              <div className="flex items-start gap-2.5">
                {Icon && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-text-mid">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-text-strong">{label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-text-dim">{Meta?.hint}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Combobox
                    options={modelOptions}
                    value={lane.value}
                    onChange={(v) => handleRouterChange(lane.key, v)}
                    placeholder={t("router.selectModel")}
                    searchPlaceholder={t("router.searchModel")}
                    emptyPlaceholder={t("router.noModelFound")}
                  />
                </div>
                {lane.key === "longContext" && (
                  <input
                    type="number"
                    value={routerConfig.longContextThreshold || 60000}
                    onChange={(e) =>
                      handleRouterChange("longContextThreshold", parseInt(e.target.value) || 60000)
                    }
                    placeholder="60000"
                    title="Token threshold"
                    className="h-9 w-24 rounded-md border border-hairline-strong bg-surface-sunken px-2 text-right font-mono text-[12px] text-text-strong outline-none transition focus:border-mint-dim"
                  />
                )}
                {lane.key === "image" && (
                  <select
                    value={config.forceUseImageAgent ? "true" : "false"}
                    onChange={(e) => handleForceUseImageAgentChange(e.target.value === "true")}
                    title="Force image agent"
                    className="h-9 w-24 rounded-md border border-hairline-strong bg-surface-sunken px-2 font-mono text-[11px] text-text-strong outline-none"
                  >
                    <option value="false">agent: auto</option>
                    <option value="true">agent: force</option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PanelHeader() {
  return (
    <header className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Route className="h-3.5 w-3.5 text-text-dim" />
        <span className="label-micro">Routing Matrix</span>
      </div>
      <span className="font-mono text-[10.5px] tracking-[0.15em] uppercase text-text-dim">
        provider , model
      </span>
    </header>
  );
}

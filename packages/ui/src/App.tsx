import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Transformers } from "@/components/Transformers";
import { Providers } from "@/components/Providers";
import { Router } from "@/components/Router";
import { JsonEditor } from "@/components/JsonEditor";
import { LogViewer } from "@/components/LogViewer";
import { CodexControlRoom } from "@/components/CodexControlRoom";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/components/ConfigProvider";
import { api } from "@/lib/api";
import {
  Settings,
  FileJson,
  FileText,
  FileCog,
  CircleArrowUp,
  Languages,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import "@/styles/animations.css";

function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { config, error } = useConfig();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState<{ version: string; changelog: string } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [hasCheckedUpdate, setHasCheckedUpdate] = useState(false);
  const [isUpdateFeatureAvailable, setIsUpdateFeatureAvailable] = useState(true);
  const hasAutoCheckedUpdate = useRef(false);

  const saveConfig = async () => {
    if (!config) {
      setToast({ message: t("app.config_missing"), type: "error" });
      return;
    }
    try {
      const response = await api.updateConfig(config);
      if (response && typeof response === "object" && "success" in response) {
        const r = response as { success: boolean; message?: string };
        setToast({ message: r.message || (r.success ? t("app.config_saved_success") : t("app.config_saved_failed")), type: r.success ? "success" : "error" });
      } else {
        setToast({ message: t("app.config_saved_success"), type: "success" });
      }
    } catch (err) {
      setToast({ message: t("app.config_saved_failed") + ": " + (err as Error).message, type: "error" });
    }
  };

  const saveConfigAndRestart = async () => {
    if (!config) {
      setToast({ message: t("app.config_missing"), type: "error" });
      return;
    }
    try {
      const response = await api.updateConfig(config);
      let ok = true;
      if (response && typeof response === "object" && "success" in response) {
        const r = response as { success: boolean; message?: string };
        if (!r.success) {
          ok = false;
          setToast({ message: r.message || t("app.config_saved_failed"), type: "error" });
        }
      }
      if (ok) {
        const r2 = await api.restartService();
        if (r2 && typeof r2 === "object" && "success" in r2) {
          const r3 = r2 as { success: boolean; message?: string };
          if (r3.success) {
            setToast({ message: r3.message || t("app.config_saved_restart_success"), type: "success" });
          }
        } else {
          setToast({ message: t("app.config_saved_restart_success"), type: "success" });
        }
      }
    } catch (err) {
      setToast({ message: t("app.config_saved_restart_failed") + ": " + (err as Error).message, type: "error" });
    }
  };

  const checkForUpdates = useCallback(
    async (showDialog: boolean = true) => {
      if (hasCheckedUpdate && isNewVersionAvailable) {
        if (showDialog) setIsUpdateDialogOpen(true);
        return;
      }
      setIsCheckingUpdate(true);
      try {
        const info = await api.checkForUpdates();
        if (info.hasUpdate && info.latestVersion && info.changelog) {
          setIsNewVersionAvailable(true);
          setNewVersionInfo({ version: info.latestVersion, changelog: info.changelog });
          if (showDialog) setIsUpdateDialogOpen(true);
        } else if (showDialog) {
          setToast({ message: t("app.no_updates_available"), type: "success" });
        }
        setHasCheckedUpdate(true);
      } catch (err) {
        setIsUpdateFeatureAvailable(false);
        if (showDialog) {
          setToast({ message: t("app.update_check_failed") + ": " + (err as Error).message, type: "error" });
        }
      } finally {
        setIsCheckingUpdate(false);
      }
    },
    [hasCheckedUpdate, isNewVersionAvailable, t]
  );

  useEffect(() => {
    const run = async () => {
      if (config) {
        setIsCheckingAuth(false);
        if (!hasCheckedUpdate && !hasAutoCheckedUpdate.current) {
          hasAutoCheckedUpdate.current = true;
          checkForUpdates(false);
        }
        return;
      }
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) {
        setIsCheckingAuth(false);
        return;
      }
      try {
        await api.getConfig();
      } catch (err) {
        if ((err as Error).message === "Unauthorized") navigate("/login");
      } finally {
        setIsCheckingAuth(false);
        if (!hasCheckedUpdate && !hasAutoCheckedUpdate.current) {
          hasAutoCheckedUpdate.current = true;
          checkForUpdates(false);
        }
      }
    };
    run();
    const onUnauth = () => navigate("/login");
    window.addEventListener("unauthorized", onUnauth);
    return () => window.removeEventListener("unauthorized", onUnauth);
  }, [config, navigate, hasCheckedUpdate, checkForUpdates]);

  const performUpdate = async () => {
    if (!newVersionInfo) return;
    try {
      const result = await api.performUpdate();
      if (result.success) {
        setToast({ message: t("app.update_successful"), type: "success" });
        setIsNewVersionAvailable(false);
        setIsUpdateDialogOpen(false);
        setHasCheckedUpdate(false);
      } else {
        setToast({ message: t("app.update_failed") + ": " + result.message, type: "error" });
      }
    } catch (err) {
      setToast({ message: t("app.update_failed") + ": " + (err as Error).message, type: "error" });
    }
  };

  if (isCheckingAuth) {
    return <BootScreen text="Initialising session…" />;
  }
  if (error) {
    return <BootScreen text={`Error: ${error.message}`} tone="error" />;
  }
  if (!config) {
    return <BootScreen text="Loading configuration…" />;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen flex-col">
        {/* ────── HEADER ────── */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-elevated text-mint">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 8 L6 4 L6 6 L10 6 L10 4 L14 8 L10 12 L10 10 L6 10 L6 12 Z" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-medium tracking-tight">Claude Code Router</span>
                <span className="label-micro">v2.0 · gateway online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <HeaderIcon label={t("app.settings")} onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </HeaderIcon>
            <HeaderIcon label={t("app.json_editor")} onClick={() => setIsJsonEditorOpen(true)}>
              <FileJson className="h-4 w-4" />
            </HeaderIcon>
            <HeaderIcon label={t("app.log_viewer")} onClick={() => setIsLogViewerOpen(true)}>
              <FileText className="h-4 w-4" />
            </HeaderIcon>
            <HeaderIcon label={t("app.presets")} onClick={() => navigate("/presets")}>
              <FileCog className="h-4 w-4" />
            </HeaderIcon>

            <Popover>
              <PopoverTrigger asChild>
                <button className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-mid hover:bg-surface-elevated hover:text-foreground">
                  <Languages className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="end">
                <button
                  className={`block w-full rounded-sm px-3 py-1.5 text-left text-xs ${i18n.language.startsWith("en") ? "bg-surface-elevated text-foreground" : "text-text-mid hover:bg-surface-elevated"}`}
                  onClick={() => i18n.changeLanguage("en")}
                >
                  English
                </button>
                <button
                  className={`block w-full rounded-sm px-3 py-1.5 text-left text-xs ${i18n.language.startsWith("zh") ? "bg-surface-elevated text-foreground" : "text-text-mid hover:bg-surface-elevated"}`}
                  onClick={() => i18n.changeLanguage("zh")}
                >
                  中文
                </button>
              </PopoverContent>
            </Popover>

            {isUpdateFeatureAvailable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => checkForUpdates(true)}
                    disabled={isCheckingUpdate}
                    className="relative ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-mid hover:bg-surface-elevated hover:text-foreground"
                  >
                    <CircleArrowUp className="h-4 w-4" />
                    {isNewVersionAvailable && !isCheckingUpdate && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-coral" />
                    )}
                    {isCheckingUpdate && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t("app.check_updates")}</TooltipContent>
              </Tooltip>
            )}

            <div className="mx-2 h-5 w-px bg-hairline" />

            <button
              onClick={saveConfig}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-hairline-strong px-3 text-xs font-medium text-text-mid transition hover:bg-surface-elevated hover:text-foreground"
            >
              <Save className="h-3.5 w-3.5" />
              {t("app.save")}
            </button>
            <button
              onClick={saveConfigAndRestart}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background transition hover:bg-foreground/90"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("app.save_and_restart")}
            </button>
          </div>
        </header>

        {/* ────── MAIN ────── */}
        <main className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-4">
            <div className="reveal-up" style={{ animationDelay: "40ms" }}>
              <CodexControlRoom />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <div className="reveal-up flex flex-col gap-4" style={{ animationDelay: "120ms" }}>
                <Router />
                <Transformers />
              </div>
              <div className="reveal-up" style={{ animationDelay: "180ms" }}>
                <Providers />
              </div>
            </div>
          </div>
        </main>

        <SettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        <JsonEditor
          open={isJsonEditorOpen}
          onOpenChange={setIsJsonEditorOpen}
          showToast={(message, type) => setToast({ message, type })}
        />
        <LogViewer
          open={isLogViewerOpen}
          onOpenChange={setIsLogViewerOpen}
          showToast={(message, type) => setToast({ message, type })}
        />

        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t("app.new_version_available")}
                {newVersionInfo && (
                  <span className="ml-2 font-mono text-sm font-normal text-text-mid">
                    v{newVersionInfo.version}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>{t("app.update_description")}</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto py-4">
              {newVersionInfo?.changelog ? (
                <div className="whitespace-pre-wrap text-sm">{newVersionInfo.changelog}</div>
              ) : (
                <div className="text-text-mid">{t("app.no_changelog_available")}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                {t("app.later")}
              </Button>
              <Button onClick={performUpdate}>{t("app.update_now")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </TooltipProvider>
  );
}

function HeaderIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-mid transition hover:bg-surface-elevated hover:text-foreground"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function BootScreen({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "error" }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-elevated text-mint">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 8 L6 4 L6 6 L10 6 L10 4 L14 8 L10 12 L10 10 L6 10 L6 12 Z" strokeLinejoin="round" />
          </svg>
        </div>
        <div className={`text-data ${tone === "error" ? "text-coral" : "text-text-mid"}`}>{text}</div>
      </div>
    </div>
  );
}

export default App;

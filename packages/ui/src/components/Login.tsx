import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { ArrowRight, KeyRound } from "lucide-react";

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem("apiKey");
      if (stored) {
        setIsLoading(true);
        try {
          await api.getConfig();
          navigate("/dashboard");
        } catch {
          localStorage.removeItem("apiKey");
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkAuth();
    const onUnauth = () => navigate("/login");
    window.addEventListener("unauthorized", onUnauth);
    return () => window.removeEventListener("unauthorized", onUnauth);
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      api.setApiKey(apiKey);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "apiKey",
          newValue: apiKey,
          url: window.location.href,
        })
      );
      await api.getConfig();
      navigate("/dashboard");
    } catch (err: any) {
      api.setApiKey("");
      if (err.message && err.message.includes("401")) {
        setError(t("login.invalidApiKey"));
      } else {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="reveal-up w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-elevated text-mint">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 8 L6 4 L6 6 L10 6 L10 4 L14 8 L10 12 L10 10 L6 10 L6 12 Z" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-text-strong">
            {t("login.title")}
          </h1>
          <p className="max-w-xs text-[13px] text-text-mid">{t("login.description")}</p>
        </div>

        <div className="panel p-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mint-dim border-t-transparent" />
              <div className="text-data text-text-mid">{t("login.validating")}</div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label htmlFor="apiKey" className="label-micro">
                  {t("login.apiKey")}
                </label>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t("login.apiKeyPlaceholder")}
                    className="h-10 w-full rounded-md border border-hairline-strong bg-surface-sunken pl-9 pr-3 font-mono text-[13px] text-text-strong placeholder:text-text-dim outline-none transition focus:border-mint-dim"
                  />
                </div>
                {error && <div className="mt-2 text-[12px] text-coral">{error}</div>}
              </div>

              <button
                type="submit"
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground text-[13px] font-medium text-background transition hover:bg-foreground/90"
              >
                {t("login.signIn")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center font-mono text-[10.5px] tracking-[0.15em] uppercase text-text-dim">
          Claude Code Router · v2.0
        </div>
      </div>
    </div>
  );
}

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SearchIcon,
  GlobeIcon,
  FileSearchIcon,
  BrainIcon,
  CheckCircleIcon,
  AlertCircle,
  Loader2,
  ArrowRightIcon,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const STEPS = [
  {
    icon: <GlobeIcon size={22} />,
    label: "Connecting to browser",
    desc: "Creating cloud browser session...",
  },
  {
    icon: <FileSearchIcon size={22} />,
    label: "Scanning website",
    desc: "Extracting meta tags, links, images...",
  },
  {
    icon: <BrainIcon size={22} />,
    label: "AI Analysis",
    desc: "Gemini is analyzing your SEO data...",
  },
  {
    icon: <CheckCircleIcon size={22} />,
    label: "Report Ready",
    desc: "Your SEO report is complete!",
  },
];

export default function Analyze() {
  const { api } = useApp();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const pollRef = useRef<any>(null);

  const navigate = useNavigate();

  const handleAnalyze = async (submitUrl?: string) => {
    const targetUrl = submitUrl || url;
    if (!targetUrl.trim()) return;

    setError("");
    setAnalyzing(true);
    setCurrentStep(0);

    try {
      // Step 1:-- Connecting

      setCurrentStep(0);

      const res = await api.post("/api/analysis/analyze", {
        url: targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      });

      if (!res.data.success) {
        throw new Error("res.data.message");
      }

      const id = res.data.analysisId;

      // Step-1 Scanning

      setCurrentStep(1);

      // Poll for completion

      let attempts = 0;
      const maxAttempts = 60;

      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            setError(
              "Analysis is taking longer than expected. Check your history later",
            );
          }
          setAnalyzing(false);
          return;
        }

        try {
          const check = await api.get(`/api/analysis/${id}`);
          const analysis = check.data.analysis;

          if (analysis.status === "completed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              setCurrentStep(3);
            }
            setTimeout(() => navigate(`/report/${id}`), 1000);
          } else if (analysis.status === "failed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              setError("Analysis Failed, the AI Model might be down");
            }
            setAnalyzing(false);
          } else {
            // Still Processing ==> Advance Visual Steps

            if (attempts > 5) {
              setCurrentStep(2);
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    } catch (err: any) {
      // Catch backend 403 Forbidden credit limitation bounds explicitly
      if (err.response?.status === 403) {
        setError(
          err.response.data.message ||
            "You have exceeded your daily credit balance limit of 5 scans. Limits reset at midnight!",
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to start analysis",
        );
      }

      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    handleAnalyze();
  };

  useEffect(() => {
    const prefillUrl = searchParams.get("url");
    if (prefillUrl) {
      (() => setUrl(prefillUrl))();
      // Auto-start if URL is provided
      setTimeout(() => handleAnalyze(prefillUrl), 500);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen pt-16 md:pt-24 bg-background relative overflow-hidden">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-1/3 -left-20 w-[350px] h-[350px] rounded-full bg-violet-500/5 blur-[100px]" />
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full bg-pink-500/5 blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-12">
        {!analyzing ? (
          <div>
            <div className="text-center mb-10 mt-24">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/8 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs font-medium text-indigo-400 tracking-wide uppercase">
                  AI-Powered SEO Audit
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-[1.1]">
                Analyze{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Any Website
                </span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                Enter a URL to get a comprehensive AI-powered SEO audit report.
              </p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3.5 rounded-xl border border-red-500/20 bg-red-500/8 text-sm flex items-start gap-3 max-w-xl mx-auto backdrop-blur-sm">
                <AlertCircle
                  size={16}
                  className="shrink-0 text-red-400 mt-0.5"
                />
                <span className="text-red-300/90 leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
              <div className="group relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 backdrop-blur-md p-1.5 pl-4 shadow-xl shadow-black/20 transition-all duration-300 focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/15 focus-within:shadow-indigo-500/10 hover:border-white/15">
                <SearchIcon
                  size={17}
                  className="text-muted-foreground/60 shrink-0 group-focus-within:text-indigo-400 transition-colors duration-200"
                />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., example.com)"
                  className="w-full bg-transparent text-foreground placeholder-muted-foreground/40 outline-none text-sm py-2.5 tracking-tight"
                  id="analyze-url-input"
                  autoFocus
                />
                <button
                  type="submit"
                  className="shrink-0 inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  id="analyze-submit-btn"
                  style={{ color: "white" }}
                >
                  Analyze
                  <ArrowRightIcon size={14} className="shrink-0" />
                </button>
              </div>
            </form>

            <div className="mt-5 text-center text-xs text-muted-foreground/50 tracking-tight">
              Try:{" "}
              {["github.com", "stripe.com", "vercel.com"].map((ex, i) => (
                <span key={ex}>
                  <button
                    onClick={() => {
                      setUrl(ex);
                    }}
                    className="text-indigo-400/80 hover:text-indigo-300 transition-colors duration-150 hover:underline underline-offset-2"
                  >
                    {ex}
                  </button>
                  {i < 2 ? <span className="mx-1.5 opacity-40">·</span> : ""}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Analyzing State */}
            <div className="text-center mb-12 mt-8">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
                Analyzing Your Website
              </h2>
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/8 bg-white/4 backdrop-blur-sm">
                <Loader2
                  size={13}
                  className="text-indigo-400 animate-spin shrink-0"
                />
                <p className="text-muted-foreground text-sm font-mono tracking-tight truncate max-w-xs">
                  {url}
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="max-w-md mx-auto space-y-3">
              {STEPS.map((step, i) => {
                const isComplete = i < currentStep;
                const isCurrent = i === currentStep;
                const isPending = i > currentStep;

                return (
                  <div
                    key={step.label}
                    className={`
                      relative flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-500 ease-out
                      ${
                        isCurrent
                          ? "border-indigo-500/30 bg-indigo-500/8 backdrop-blur-md shadow-lg shadow-indigo-500/10 scale-[1.01]"
                          : isComplete
                            ? "border-white/6 bg-white/3 opacity-70"
                            : "border-white/4 bg-white/2 opacity-30"
                      }
                    `}
                  >
                    {/* Glow line for current */}
                    {isCurrent && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
                    )}

                    <div
                      className={`
                        w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                        ${
                          isComplete
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : isCurrent
                              ? "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30"
                              : "bg-white/4 text-muted-foreground/40 border border-white/5"
                        }
                      `}
                      style={isCurrent ? { color: "white" } : {}}
                    >
                      {isComplete ? <CheckCircleIcon size={17} /> : step.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium tracking-tight leading-none mb-0.5 ${
                          isPending
                            ? "text-muted-foreground/40"
                            : isCurrent
                              ? "text-foreground"
                              : "text-foreground/60"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p
                        className={`text-xs leading-snug ${isCurrent ? "text-indigo-400/80" : "text-muted-foreground/40"}`}
                      >
                        {step.desc}
                      </p>
                    </div>

                    {isCurrent && (
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                    {isComplete && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400/60 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-foreground/35 mt-8 tracking-tight">
              This may take 15–30 seconds depending on the website.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

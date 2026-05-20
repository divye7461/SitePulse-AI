import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SearchIcon,
  ArrowRightIcon,
  BarChart3Icon,
  GlobeIcon,
  TrendingUpIcon,
} from "lucide-react";
import AnalysesCard from "../components/AnalysesCard";
import { useApp } from "../context/AppContext";

interface AnalysisSummary {
  _id: string;
  url: string;
  overallScore: number;
  status: string;
  createdAt: string;
  categories: {
    seo: number;
    performance: number;
    accessibility: number;
    bestPractices: number;
  };
}

export default function Dashboard() {
  // Pull down standard user data alongside your root api connector instance
  const { user, api } = useApp();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. ADD LOCAL LIVE COUNT STATE INITIALIZED WITH CONTEXT FALLBACK
  const [displayCount, setDisplayCount] = useState(user?.analysisCount || 5);

  const fetchRecent = async () => {
    try {
      const res = await api.get("/api/analysis/list?limit=6");
      if (res.data.success) {
        setAnalyses(res.data.analyses);
      }
    } catch (error) {
      console.error("Failed to fetch Analyses", error);
    }
  };

  // 2. CREATE FETCH PIPE TO GRAB THE LATEST DB USER ANALYSIS COUNT
  const fetchLatestUserStats = async () => {
    try {
      // Hits your auth controller's getCurrentUser function
      const res = await api.get("/api/auth/user");
      if (res.data.success && res.data.user) {
        setDisplayCount(res.data.user.analysisCount);
      }
    } catch (error) {
      console.error("Failed to sync profile metrics:", error);
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/analyze?url=${encodeURIComponent(url)}`);
    }
  };

  const completedAnalyses = analyses.filter((a) => a.status === "completed");
  const avgScore = completedAnalyses.length
    ? Math.round(
        completedAnalyses.reduce((sum, a) => sum + a.overallScore, 0) /
          completedAnalyses.length,
      )
    : 0;

  const getScoreClass = (s: number) => {
    if (s >= 80) return "score-good";
    if (s >= 50) return "score-medium";
    return "score-poor";
  };

  // 3. EFFECT FORCING SYNC EVERY TIME THE DASHBOARD MOUNTS
  useEffect(() => {
    const initDashboardData = async () => {
      setLoading(true);
      // Run both tasks in parallel to avoid layout blocking
      await Promise.all([fetchRecent(), fetchLatestUserStats()]);
      setLoading(false);
    };

    initDashboardData();
  }, []);

  // 4. WATCH CONTEXT FALLBACK TO ENSURE VALUE STABILITY
  useEffect(() => {
    if (user?.analysisCount !== undefined) {
      setDisplayCount(user.analysisCount);
    }
  }, [user?.analysisCount]);

  return (
    <div className="min-h-screen pt-16 md:pt-24 bg-background relative overflow-hidden">
      {/* Ambient glow layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px]" />
        <div className="absolute top-1/2 -right-24 w-[300px] h-[300px] rounded-full bg-violet-500/4 blur-[90px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium text-indigo-400/70 uppercase tracking-widest mb-2">
            Dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1.5">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              {user?.name}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Analyze websites and boost your SEO performance.
          </p>
        </div>

        {/* Quick Analyze */}
        <form
          onSubmit={handleAnalyze}
          className="mb-10 group"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex items-center gap-2 max-w-2xl rounded-2xl border border-white/10 bg-white/4 backdrop-blur-md p-1.5 pl-4 shadow-xl shadow-black/20 transition-all duration-300 focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/15 hover:border-white/15">
            <SearchIcon
              size={16}
              className="text-muted-foreground/50 shrink-0 group-focus-within:text-indigo-400 transition-colors duration-200"
            />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a URL to analyze..."
              className="w-full bg-transparent text-foreground placeholder-muted-foreground/40 outline-none text-sm py-2.5 tracking-tight"
              id="dashboard-url-input"
            />
            <button
              type="submit"
              className="shrink-0 inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
              style={{ color: "white" }}
              id="dashboard-analyze-btn"
            >
              Analyze
              <ArrowRightIcon size={14} className="shrink-0" />
            </button>
          </div>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Total Scans */}
          <div className="group relative rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:border-indigo-500/20 hover:bg-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/8 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
              <GlobeIcon size={20} />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {analyses.length}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 font-medium">
                Total Scans
              </p>
            </div>
          </div>

          {/* Avg Score */}
          <div className="group relative rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:border-violet-500/20 hover:bg-violet-500/5 hover:shadow-lg hover:shadow-violet-500/8 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
              <TrendingUpIcon size={20} />
            </div>
            <div>
              <p
                className={`text-2xl font-semibold tracking-tight tabular-nums ${getScoreClass(avgScore)}`}
              >
                {avgScore}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 font-medium">
                Avg Score
              </p>
            </div>
          </div>

          {/* Scans Left */}
          <div className="group relative rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:border-pink-500/20 hover:bg-pink-500/5 hover:shadow-lg hover:shadow-pink-500/8 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 shrink-0">
              <BarChart3Icon size={20} />
            </div>
            <div>
              {/* RENDERS THE LIVE STATE VALUE FOR REAL-TIME DROPS */}
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {user?.plan === "free" ? `${displayCount}` : "∞"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 font-medium">
                Scans Left Today
              </p>
            </div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Recent Analyses
              </h2>
              {completedAnalyses.length > 0 && (
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {completedAnalyses.length} completed scan
                  {completedAnalyses.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {analyses.length > 0 && (
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400/80 hover:text-indigo-300 transition-colors duration-150 hover:underline underline-offset-2"
              >
                View All <ArrowRightIcon size={13} />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="relative">
                <div className="size-7 border-2 border-indigo-500/30 rounded-full" />
                <div className="size-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
              </div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="rounded-2xl border border-white/6 bg-white/2 backdrop-blur-sm p-14 text-center">
              <div className="w-14 h-14 rounded-2xl border border-white/8 bg-white/4 flex items-center justify-center mx-auto mb-4">
                <SearchIcon size={22} className="text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground mb-1.5">
                No analyses yet
              </h3>
              <p className="text-sm text-muted-foreground/50 leading-relaxed">
                Enter a URL above to run your first SEO analysis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.map((a) => (
                <AnalysesCard key={a._id} analysis={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

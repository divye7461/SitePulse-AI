import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Trash2,
  ExternalLink,
  Search,
  AlertCircle,
  Loader2,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import ScoreGauge from "../components/ScoreGauge";
import { useApp } from "../context/AppContext";

interface AnalysisItem {
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

export default function History() {
  const { api } = useApp();
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/analysis/list?page=${page}&limit=12`);
      if (res.data.success) {
        setAnalyses(res.data.analyses);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch", error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this analysis?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/analysis/${id}`);
      setAnalyses((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.error("Failed to delete", error);
    }
    setDeleting(null);
  };

  const getScoreClass = (s: number) => {
    if (s >= 80) return "score-good";
    if (s >= 50) return "score-medium";
    return "score-poor";
  };

  const getScorePillBg = (s: number) => {
    if (s >= 80)
      return "bg-emerald-500/10 border border-emerald-500/15 text-emerald-400";
    if (s >= 50)
      return "bg-amber-500/10 border border-amber-500/15 text-amber-400";
    return "bg-red-500/10 border border-red-500/15 text-red-400";
  };

  let processedData = [...analyses];

  if (searchQuery) {
    processedData = processedData.filter((a) =>
      a.url.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  if (statusFilter !== "all") {
    processedData = processedData.filter((a) => a.status === statusFilter);
  }

  processedData.sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "score_high") {
      return b.overallScore - a.overallScore;
    } else if (sortBy === "score_low") {
      return a.overallScore - b.overallScore;
    }
    return 0;
  });

  useEffect(() => {
    (async () => await fetchAnalyses())();
  }, [page]);

  return (
    <div className="min-h-screen pt-16 md:pt-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[280px] rounded-full bg-violet-500/5 blur-[110px]" />
        <div className="absolute bottom-1/3 -left-20 w-[300px] h-[300px] rounded-full bg-indigo-500/4 blur-[90px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-indigo-400/70 uppercase tracking-widest mb-2">
              Records
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Analysis{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                History
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              View and manage all your past SEO analyses.
            </p>
          </div>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] self-start"
            style={{ color: "white" }}
          >
            New Analysis
          </Link>
        </div>

        {/* Filters Row */}
        <div
          className="mb-6 flex flex-col md:flex-row gap-3"
          style={{ animationDelay: "100ms" }}
        >
          {/* Search */}
          <div className="group flex items-center gap-2.5 flex-1 rounded-xl border border-white/10 bg-white/4 backdrop-blur-md px-4 py-2.5 transition-all duration-300 focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/15 hover:border-white/15">
            <Search
              size={15}
              className="text-muted-foreground/50 shrink-0 group-focus-within:text-indigo-400 transition-colors duration-200"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by URL..."
              className="bg-transparent text-sm text-foreground placeholder-muted-foreground/40 outline-none flex-1 tracking-tight"
              id="history-search-input"
            />
          </div>

          <div className="flex gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 backdrop-blur-md px-3.5 py-2.5 hover:border-white/15 transition-all duration-200">
              <Filter size={14} className="text-muted-foreground/50 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm text-foreground/80 outline-none appearance-none pr-2 cursor-pointer"
              >
                <option value="all" className="bg-background">
                  All Status
                </option>
                <option value="completed" className="bg-background">
                  Completed
                </option>
                <option value="processing" className="bg-background">
                  Processing
                </option>
                <option value="failed" className="bg-background">
                  Failed
                </option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 backdrop-blur-md px-3.5 py-2.5 hover:border-white/15 transition-all duration-200">
              <ArrowUpDown
                size={14}
                className="text-muted-foreground/50 shrink-0"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-sm text-foreground/80 outline-none appearance-none pr-2 cursor-pointer"
              >
                <option value="newest" className="bg-background">
                  Newest First
                </option>
                <option value="oldest" className="bg-background">
                  Oldest First
                </option>
                <option value="score_high" className="bg-background">
                  Highest Score
                </option>
                <option value="score_low" className="bg-background">
                  Lowest Score
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="size-7 border-2 border-indigo-500/30 rounded-full" />
              <div className="size-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-white/2 backdrop-blur-sm p-14 text-center">
            <div className="w-14 h-14 rounded-2xl border border-white/8 bg-white/4 flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground mb-1.5">
              {searchQuery ? "No matching analyses" : "No analyses yet"}
            </h3>
            <p className="text-sm text-muted-foreground/50 leading-relaxed">
              {searchQuery
                ? "Try a different search term."
                : "Run your first SEO analysis to see it here."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5" style={{ animationDelay: "200ms" }}>
            {processedData.map((a) => (
              <div
                key={a._id}
                className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm px-4 sm:px-5 py-4 hover:-translate-y-px hover:border-indigo-500/20 hover:bg-indigo-500/4 hover:shadow-lg hover:shadow-indigo-500/6 transition-all duration-300 ease-out"
              >
                {/* Left accent bar on hover */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Score gauge */}
                <div className="shrink-0">
                  {a.status === "completed" ? (
                    <ScoreGauge
                      score={a.overallScore}
                      size={52}
                      strokeWidth={4}
                    />
                  ) : a.status === "processing" ? (
                    <div className="w-[52px] h-[52px] rounded-xl border border-indigo-500/20 bg-indigo-500/8 flex items-center justify-center">
                      <Loader2
                        size={18}
                        className="text-indigo-400 animate-spin"
                      />
                    </div>
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-xl border border-red-500/20 bg-red-500/8 flex items-center justify-center">
                      <AlertCircle size={18} className="text-red-400" />
                    </div>
                  )}
                </div>

                {/* URL + Meta */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/report/${a._id}`}
                    className="text-sm font-semibold tracking-tight text-foreground hover:text-indigo-300 transition-colors duration-150 truncate block"
                  >
                    {(() => {
                      try {
                        return new URL(a.url).hostname;
                      } catch {
                        return a.url;
                      }
                    })()}
                  </Link>
                  <p className="text-xs text-muted-foreground/50 truncate mt-0.5 font-mono">
                    {a.url}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1 tabular-nums">
                      <Clock size={11} />
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                        a.status === "completed"
                          ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-400"
                          : a.status === "processing"
                            ? "bg-indigo-500/10 border-indigo-500/15 text-indigo-400"
                            : "bg-red-500/10 border-red-500/15 text-red-400"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>

                {/* Category score pills — desktop only */}
                {a.status === "completed" && (
                  <div className="hidden lg:flex items-center gap-1.5">
                    {[
                      { label: "SEO", value: a.categories.seo },
                      { label: "Perf", value: a.categories.performance },
                      { label: "A11y", value: a.categories.accessibility },
                      { label: "BP", value: a.categories.bestPractices },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${getScorePillBg(c.value)}`}
                      >
                        <p
                          className={`text-xs font-semibold tabular-nums ${getScoreClass(c.value)}`}
                        >
                          {c.value}
                        </p>
                        <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wide mt-0.5">
                          {c.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to={`/report/${a._id}`}
                    className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/6 text-muted-foreground/50 hover:text-indigo-400 transition-all duration-150"
                    title="View Report"
                  >
                    <ExternalLink size={15} />
                  </Link>
                  <button
                    onClick={() => handleDelete(a._id)}
                    disabled={deleting === a._id}
                    className="p-2 rounded-lg border border-transparent hover:border-red-500/15 hover:bg-red-500/8 text-muted-foreground/50 hover:text-red-400 transition-all duration-150 disabled:opacity-40"
                    title="Delete"
                  >
                    {deleting === a._id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm text-sm text-foreground/70 disabled:opacity-30 hover:border-indigo-500/25 hover:bg-indigo-500/6 hover:text-foreground transition-all duration-200"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-xs text-muted-foreground/50 tabular-nums font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm text-sm text-foreground/70 disabled:opacity-30 hover:border-indigo-500/25 hover:bg-indigo-500/6 hover:text-foreground transition-all duration-200"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

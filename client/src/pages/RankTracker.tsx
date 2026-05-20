/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Clock,
  Loader2,
  X,
  Search,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
  Filter,
  ArrowUpDown,
  Rss,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface KeywordItem {
  _id: string;
  keyword: string;
  url: string;
  domain: string;
  currentPosition: number | null;
  currentPage: number | null;
  bestPosition: number | null;
  positionChange: number;
  active: boolean;
  lastChecked: string | null;
  status: string;
  competitors: {
    position: number;
    url: string;
    domain: string;
    title: string;
    snippet: string;
  }[];
}

export default function RankTracker() {
  const { api } = useApp();
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchKeywords = async () => {
    try {
      const res = await api.get("/api/rank/list");
      if (res.data.success) {
        setKeywords(res.data.keywords);
      }
    } catch (error) {
      console.error("Error fetching keywords:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newUrl.trim()) {
      setAddError("Both fields are required.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await api.post("/api/rank/add", {
        keyword: newKeyword.trim(),
        url: newUrl.trim(),
      });
      if (res.data.success) {
        setKeywords((prev) => [res.data.tracking, ...prev]);
        setNewKeyword("");
        setNewUrl("");
        setShowAddModal(false);

        // Poll for completion

        const id = res.data.tracking._id;
        const pollInterval = setInterval(async () => {
          try {
            const check = await api.get(`/api/rank/${id}`);
            if (check.data.tracking.status !== "checking") {
              clearInterval(pollInterval);
              setKeywords((prev) =>
                prev.map((k) => (k._id === id ? check.data.tracking : k)),
              );
            }
          } catch (error) {
            console.error("Error polling keyword status:", error);
            clearInterval(pollInterval);
          }
        }, 3000);
      } else {
        setAddError(res.data.message || "Failed to add keyword.");
      }
    } catch (error: any) {
      setAddError(
        error.response?.data?.message ||
          "An error occurred while adding the keyword.",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshing(id);
    try {
      await api.post(`/api/rank/${id}/refresh`);

      // Update status to "checking" immediately in the UI
      setKeywords((prev) =>
        prev.map((k) => (k._id === id ? { ...k, status: "checking" } : k)),
      );

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const check = await api.get(`/api/rank/${id}`);

          // If the background scraping job finishes (completed or failed)
          if (check.data.tracking.status !== "checking") {
            clearInterval(pollInterval);
            setKeywords((prev) =>
              prev.map((k) => (k._id === id ? check.data.tracking : k)),
            );
            setRefreshing(null);
          }
        } catch (error) {
          console.error("Error polling keyword status:", error);
          clearInterval(pollInterval);
          setRefreshing(null);
        }
      }, 3000);
    } catch (error) {
      console.error("Error refreshing keyword:", error);
      setRefreshing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this keyword tracking?")) return;
    setDeleting(id);
    try {
      const res = await api.delete(`/api/rank/${id}`);
      if (res.data.success) {
        setKeywords((prev) => prev.filter((k) => k._id !== id));
      }
    } catch (error) {
      console.error("Error deleting keyword:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await api.put(`/api/rank/${id}/toggle`);
      if (res.data.success) {
        setKeywords((prev) =>
          prev.map((k) =>
            k._id === id ? { ...k, active: res.data.tracking.active } : k,
          ),
        );
      }
    } catch (error) {
      console.error("Error toggling keyword:", error);
    }
  };

  const getPositionBadge = (pos: number | null) => {
    if (pos === null)
      return {
        text: "Not Ranked",
        class: "text-muted-foreground/60 bg-white/4 border border-white/8",
      };
    if (pos <= 3)
      return {
        text: `#${pos}`,
        class:
          "text-emerald-400 bg-emerald-500/12 border border-emerald-500/25",
      };
    if (pos <= 10)
      return {
        text: `#${pos}`,
        class: "text-indigo-400 bg-indigo-500/12 border border-indigo-500/25",
      };
    if (pos <= 20)
      return {
        text: `#${pos}`,
        class: "text-amber-400 bg-amber-500/12 border border-amber-500/25",
      };
    return {
      text: `#${pos}`,
      class: "text-red-400 bg-red-500/12 border border-red-500/25",
    };
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0)
      return {
        icon: <TrendingUp size={13} />,
        text: `+${change}`,
        class:
          "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15",
      };
    if (change < 0)
      return {
        icon: <TrendingDown size={13} />,
        text: `${change}`,
        class: "text-red-400 bg-red-500/10 border border-red-500/15",
      };
    return {
      icon: <Minus size={13} />,
      text: "0",
      class: "text-muted-foreground/50 bg-white/4 border border-white/8",
    };
  };

  let processedData = [...keywords];

  if (searchQuery) {
    processedData = processedData.filter(
      (k) =>
        k.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.domain.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  if (statusFilter !== "all") {
    if (statusFilter === "active") {
      processedData = processedData.filter((k) => k.active === true);
    } else if (statusFilter === "paused") {
      processedData = processedData.filter((k) => k.active === false);
    }
  }

  processedData.sort((a: any, b: any) => {
    if (sortBy === "newest") {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    } else if (sortBy === "rank_asc") {
      return (a.currentPosition || 999) - (b.currentPosition || 999);
    } else if (sortBy === "rank_desc") {
      return (b.currentPosition || 0) - (a.currentPosition || 0);
    } else if (sortBy === "change") {
      return (b.positionChange || 0) - (a.positionChange || 0);
    }
    return 0;
  });

  useEffect(() => {
    (async () => await fetchKeywords())();
  }, []);

  return (
    <div className="min-h-screen pt-16 md:pt-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-[500px] h-[280px] rounded-full bg-indigo-500/5 blur-[110px]" />
        <div className="absolute top-2/3 -right-20 w-[300px] h-[300px] rounded-full bg-violet-500/4 blur-[90px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-indigo-400/70 uppercase tracking-widest mb-2">
              Monitoring
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Rank Tracker
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Track your keyword rankings on Google — updated daily.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] self-start"
            id="add-keyword-btn"
            style={{ color: "white" }}
          >
            <Plus size={16} />
            Track Keyword
          </button>
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
              placeholder="Search keywords or domains..."
              className="bg-transparent text-sm text-foreground placeholder-muted-foreground/40 outline-none flex-1 tracking-tight"
              id="rank-search-input"
            />
          </div>

          <div className="flex gap-3">
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
                <option value="active" className="bg-background">
                  Active
                </option>
                <option value="paused" className="bg-background">
                  Paused
                </option>
              </select>
            </div>
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
                <option value="rank_asc" className="bg-background">
                  Highest Ranked
                </option>
                <option value="rank_desc" className="bg-background">
                  Lowest Ranked
                </option>
                <option value="change" className="bg-background">
                  Biggest Gain
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Keywords List */}
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
              <Target size={22} className="text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground mb-1.5">
              No keywords tracked yet
            </h3>
            <p className="text-sm text-muted-foreground/50 leading-relaxed mb-6">
              Add your first keyword and URL to start tracking your Google
              rankings.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ color: "white" }}
            >
              <Target size={15} />
              Track Your First Keyword
            </button>
          </div>
        ) : (
          <div className="space-y-2.5" style={{ animationDelay: "200ms" }}>
            {processedData.map((kw) => {
              const posBadge = getPositionBadge(kw.currentPosition);
              const change = getChangeIndicator(kw.positionChange);

              return (
                <div
                  key={kw._id}
                  className={`group relative rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm px-5 py-4 hover:-translate-y-px hover:border-indigo-500/20 hover:bg-indigo-500/4 hover:shadow-lg hover:shadow-indigo-500/6 transition-all duration-300 ease-out ${!kw.active ? "opacity-40" : ""}`}
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Rank badge + change */}
                    <div className="flex items-center gap-3 lg:w-36 shrink-0">
                      {kw.status === "checking" ? (
                        <div className="w-14 h-14 rounded-xl border border-indigo-500/20 bg-indigo-500/8 flex items-center justify-center">
                          <Loader2
                            size={20}
                            className="text-indigo-400 animate-spin"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold tracking-tight ${posBadge.class}`}
                        >
                          {kw.currentPosition ? `#${kw.currentPosition}` : "—"}
                        </div>
                      )}
                      {kw.status === "completed" && kw.currentPosition && (
                        <div
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${change.class}`}
                        >
                          {change.icon}
                          {change.text}
                        </div>
                      )}
                    </div>

                    {/* Keyword + domain info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/rank/${kw._id}`}
                        className="text-sm font-semibold tracking-tight text-foreground hover:text-indigo-300 transition-colors duration-150 block truncate"
                      >
                        "{kw.keyword}"
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Globe
                          size={11}
                          className="text-muted-foreground/40 shrink-0"
                        />
                        <span className="text-xs text-muted-foreground/50 truncate font-mono">
                          {kw.domain}
                        </span>
                        {kw.currentPage && (
                          <span className="text-[10px] text-muted-foreground/40 border border-white/8 bg-white/4 px-1.5 py-0.5 rounded-full">
                            p.{kw.currentPage}
                          </span>
                        )}
                      </div>
                      {kw.lastChecked && (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/35">
                          <Clock size={10} />
                          <span className="tabular-nums">
                            {new Date(kw.lastChecked).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats — desktop */}
                    {kw.status === "completed" && (
                      <div className="hidden md:flex items-center gap-4">
                        <div className="flex flex-col items-center px-3 py-1.5 rounded-lg border border-indigo-500/15 bg-indigo-500/8">
                          <p className="text-sm font-semibold text-indigo-400 tabular-nums">
                            {kw.bestPosition || "—"}
                          </p>
                          <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wide mt-0.5">
                            Best
                          </p>
                        </div>
                        <div className="flex flex-col items-center px-3 py-1.5 rounded-lg border border-violet-500/15 bg-violet-500/8">
                          <p className="text-sm font-semibold text-violet-400 tabular-nums">
                            {kw.competitors?.length || 0}
                          </p>
                          <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wide mt-0.5">
                            Rivals
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        to={`/rank/${kw._id}`}
                        className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/6 text-muted-foreground/50 hover:text-indigo-400 transition-all duration-150"
                        title="View Details"
                      >
                        <ExternalLink size={15} />
                      </Link>
                      <button
                        onClick={() => handleRefresh(kw._id)}
                        disabled={
                          refreshing === kw._id || kw.status === "checking"
                        }
                        className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/6 text-muted-foreground/50 hover:text-indigo-400 transition-all duration-150 disabled:opacity-30"
                        title="Refresh Ranking"
                      >
                        <RefreshCw
                          size={15}
                          className={
                            refreshing === kw._id ? "animate-spin" : ""
                          }
                        />
                      </button>
                      <button
                        onClick={() => handleToggle(kw._id)}
                        className={`p-2 rounded-lg border border-transparent transition-all duration-150 ${kw.active ? "hover:border-emerald-500/15 hover:bg-emerald-500/8 text-emerald-400/70 hover:text-emerald-400" : "hover:border-white/10 hover:bg-white/6 text-muted-foreground/40 hover:text-foreground"}`}
                        title={kw.active ? "Pause Tracking" : "Resume Tracking"}
                      >
                        {kw.active ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button
                        onClick={() => handleDelete(kw._id)}
                        disabled={deleting === kw._id}
                        className="p-2 rounded-lg border border-transparent hover:border-red-500/15 hover:bg-red-500/8 text-muted-foreground/50 hover:text-red-400 transition-all duration-150 disabled:opacity-40"
                        title="Delete"
                      >
                        {deleting === kw._id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Keyword Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-6">
            {/* Modal glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 bg-indigo-500/10 blur-[40px]" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Track New Keyword
                  </h2>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    We'll check Google rankings daily.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError("");
                  }}
                  className="p-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/6 text-muted-foreground/50 hover:text-foreground transition-all duration-150"
                >
                  <X size={16} />
                </button>
              </div>

              {addError && (
                <div className="mb-4 px-3.5 py-3 rounded-xl border border-red-500/20 bg-red-500/8 text-sm flex items-start gap-2.5">
                  <AlertCircle
                    size={15}
                    className="shrink-0 text-red-400 mt-0.5"
                  />
                  <span className="text-red-300/90 leading-snug text-xs">
                    {addError}
                  </span>
                </div>
              )}

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label
                    htmlFor="modal-keyword"
                    className="block text-xs font-medium text-muted-foreground/70 mb-1.5 uppercase tracking-wide"
                  >
                    Keyword
                  </label>
                  <div className="relative group">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-indigo-400 transition-colors duration-200"
                    />
                    <input
                      id="modal-keyword"
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder='"best seo tools"'
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/4 backdrop-blur-sm text-foreground placeholder-muted-foreground/30 outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200 text-sm tracking-tight"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="modal-url"
                    className="block text-xs font-medium text-muted-foreground/70 mb-1.5 uppercase tracking-wide"
                  >
                    Website URL
                  </label>
                  <div className="relative group">
                    <Globe
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-indigo-400 transition-colors duration-200"
                    />
                    <input
                      id="modal-url"
                      type="text"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/4 backdrop-blur-sm text-foreground placeholder-muted-foreground/30 outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border border-indigo-500/15 bg-indigo-500/6">
                  <Rss size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    We'll search Google for your keyword, find your website's
                    position (up to page 5), and track it daily.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  style={{ color: "white" }}
                >
                  {adding ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Target size={15} />
                      Start Tracking
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

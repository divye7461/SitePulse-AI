/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  Globe,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Trophy,
  Users,
  Calendar,
  Loader2,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface RankHistoryEntry {
  date: string;
  position: number | null;
  page: number | null;
  title: string;
  snippet: string;
}

interface Competitor {
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string;
}

interface TrackingData {
  _id: string;
  keyword: string;
  url: string;
  domain: string;
  currentPosition: number | null;
  currentPage: number | null;
  bestPosition: number | null;
  positionChange: number;
  rankHistory: RankHistoryEntry[];
  competitors: Competitor[];
  active: boolean;
  lastChecked: string | null;
  status: string;
  createdAt: string;
}

export default function RankDetail() {
  const { api } = useApp();
  const { id } = useParams();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const chartRef = useRef<HTMLCanvasElement>(null);

  const fetchTracking = async () => {
    try {
      const res = await api.get(`api/rank/${id}`);
      if (res.data.success) {
        if (res.data.tracking.status === "checking") {
          setTimeout(fetchTracking, 3000);
          setTracking(res.data.tracking);
          return;
        }
        setTracking(res.data.tracking);
      }
    } catch (error) {}
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!tracking) return;
    setRefreshing(true);
    try {
      await api.post(`/api/rank/${tracking._id}/refresh`);
      setTracking((prev) => (prev ? { ...prev, status: "checking" } : prev));

      const pollInterval = setInterval(async () => {
        try {
          const checkRes = await api.get(`/api/rank/${tracking._id}`);
          if (
            checkRes.data.success &&
            checkRes.data.tracking.status !== "checking"
          ) {
            clearInterval(pollInterval);
            setTracking(checkRes.data.tracking);
            setRefreshing(false);
          }
        } catch (error) {
          console.log("Error polling rank status:", error);
        }
      }, 3000);
    } catch (error) {
      console.log("Error refreshing rank:", error);
      setRefreshing(false);
    }
  };

  const drawChart = () => {
    const canvas = chartRef.current;
    if (!canvas || !tracking) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const history = tracking.rankHistory
      .filter((h) => h.position !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (history.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const positions = history.map((h) => h.position!);
    const minPos = Math.max(1, Math.min(...positions) - 2);
    const maxPos = Math.max(...positions) + 2;

    const styles = getComputedStyle(document.documentElement);
    const borderColor =
      styles.getPropertyValue("--border").trim() || "rgba(128,128,128,0.2)";
    const primaryColor =
      styles.getPropertyValue("--accent").trim() || "#3b82f6";
    const textColor =
      styles.getPropertyValue("--muted-foreground").trim() ||
      "rgba(128,128,128,0.5)";
    const bgColor = styles.getPropertyValue("--background").trim() || "#ffffff";

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const posVal = Math.round(minPos + ((maxPos - minPos) / gridLines) * i);
      ctx.fillStyle = textColor;
      ctx.font = "11px Outfit";
      ctx.textAlign = "right";
      ctx.fillText(`#${posVal}`, padding.left - 8, y + 4);
    }

    ctx.fillStyle = textColor;
    ctx.font = "10px Outfit";
    ctx.textAlign = "center";
    const maxLabels = Math.min(history.length, 7);
    const labelStep = Math.max(1, Math.floor(history.length / maxLabels));
    for (let i = 0; i < history.length; i += labelStep) {
      const x = padding.left + (chartW / Math.max(history.length - 1, 1)) * i;
      const date = new Date(history[i].date);
      ctx.fillText(
        `${date.getMonth() + 1}/${date.getDate()}`,
        x,
        h - padding.bottom + 20,
      );
    }

    ctx.beginPath();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    history.forEach((entry, i) => {
      const x = padding.left + (chartW / Math.max(history.length - 1, 1)) * i;
      const yNorm = (entry.position! - minPos) / (maxPos - minPos);
      const y = padding.top + yNorm * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(
      0,
      padding.top,
      0,
      h - padding.bottom,
    );
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.15)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0)");

    ctx.beginPath();
    history.forEach((entry, i) => {
      const x = padding.left + (chartW / Math.max(history.length - 1, 1)) * i;
      const yNorm = (entry.position! - minPos) / (maxPos - minPos);
      const y = padding.top + yNorm * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + chartW, h - padding.bottom);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    history.forEach((entry, i) => {
      const x = padding.left + (chartW / Math.max(history.length - 1, 1)) * i;
      const yNorm = (entry.position! - minPos) / (maxPos - minPos);
      const y = padding.top + yNorm * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = bgColor;
      ctx.fill();
    });

    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = textColor;
    ctx.font = "11px Outfit";
    ctx.textAlign = "center";
    ctx.fillText("Position", 0, 0);
    ctx.restore();
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0)
      return {
        icon: <TrendingUp size={16} />,
        text: `+${change}`,
        class: "text-emerald-400",
      };
    if (change < 0)
      return {
        icon: <TrendingDown size={16} />,
        text: `${change}`,
        class: "text-red-400",
      };
    return {
      icon: <Minus size={16} />,
      text: "—",
      class: "text-muted-foreground/50",
    };
  };

  const getPositionColor = (pos: number | null) => {
    if (pos === null) return "text-muted-foreground/50";
    if (pos <= 3) return "text-emerald-400";
    if (pos <= 10) return "text-indigo-400";
    if (pos <= 20) return "text-amber-400";
    return "text-red-400";
  };

  useEffect(() => {
    (async () => await fetchTracking())();
  }, [id]);

  useEffect(() => {
    if (tracking && tracking.rankHistory.length > 0 && chartRef.current) {
      drawChart();
    }
  }, [tracking, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="size-8 border-2 border-indigo-500/30 rounded-full" />
          <div className="size-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-10">
          <div className="w-14 h-14 rounded-2xl border border-red-500/20 bg-red-500/8 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={22} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">
            Tracking Not Found
          </h2>
          <p className="text-sm text-muted-foreground/50 mb-5">
            This keyword tracking entry doesn't exist or was deleted.
          </p>
          <Link
            to="/rank-tracker"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.02]"
            style={{ color: "white" }}
          >
            <ArrowLeft size={14} />
            Back to Rank Tracker
          </Link>
        </div>
      </div>
    );
  }

  const change = getChangeIndicator(tracking.positionChange);
  const tabs = [
    { id: "overview", label: "Overview" },
    {
      id: "competitors",
      label: `Competitors (${tracking.competitors.length})`,
    },
    { id: "history", label: "History" },
  ];

  return (
    <div className="min-h-screen pt-16 md:pt-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/3 w-[500px] h-[280px] rounded-full bg-indigo-500/5 blur-[110px]" />
        <div className="absolute bottom-1/2 -left-20 w-[300px] h-[300px] rounded-full bg-violet-500/4 blur-[90px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back + Header */}
        <div className="mb-8">
          <Link
            to="/rank-tracker"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150 mb-5"
          >
            <ArrowLeft size={14} />
            Back to Rank Tracker
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-indigo-400/70 uppercase tracking-widest mb-2">
                Keyword Detail
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                "
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  {tracking.keyword}
                </span>
                "
              </h1>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/50">
                <Globe size={12} />
                <span className="font-mono">{tracking.domain}</span>
                <span className="opacity-30">·</span>
                <a
                  href={tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400/70 hover:text-indigo-300 hover:underline underline-offset-2 flex items-center gap-1 transition-colors"
                >
                  Visit site <ExternalLink size={11} />
                </a>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing || tracking.status === "checking"}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-foreground/80 hover:border-indigo-500/25 hover:bg-indigo-500/6 hover:text-foreground transition-all duration-200 disabled:opacity-40 self-start"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh Now
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          style={{ animationDelay: "100ms" }}
        >
          {/* Current Position */}
          <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 text-center hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300">
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
              <Target size={11} /> Current Position
            </p>
            {tracking.status === "checking" ? (
              <div className="flex justify-center py-1">
                <Loader2 size={28} className="animate-spin text-indigo-400" />
              </div>
            ) : (
              <p
                className={`text-4xl font-bold tracking-tight tabular-nums ${getPositionColor(tracking.currentPosition)}`}
              >
                {tracking.currentPosition
                  ? `#${tracking.currentPosition}`
                  : "—"}
              </p>
            )}
            {tracking.currentPage && (
              <p className="text-[11px] text-muted-foreground/40 mt-1.5">
                Page {tracking.currentPage}
              </p>
            )}
          </div>

          {/* Position Change */}
          <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 text-center hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300">
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
              <TrendingUp size={11} /> Position Change
            </p>
            <div
              className={`text-3xl font-bold flex items-center justify-center gap-2 ${change.class}`}
            >
              {change.icon}
              {change.text}
            </div>
            <p className="text-[11px] text-muted-foreground/40 mt-1.5">
              since last check
            </p>
          </div>

          {/* Best Position */}
          <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 text-center hover:-translate-y-0.5 hover:border-emerald-500/15 transition-all duration-300">
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
              <Trophy size={11} /> Best Position
            </p>
            <p
              className={`text-3xl font-bold tracking-tight tabular-nums ${getPositionColor(tracking.bestPosition)}`}
            >
              {tracking.bestPosition ? `#${tracking.bestPosition}` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground/40 mt-1.5">
              all time
            </p>
          </div>

          {/* Data Points */}
          <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 text-center hover:-translate-y-0.5 hover:border-violet-500/15 transition-all duration-300">
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
              <Calendar size={11} /> Data Points
            </p>
            <p className="text-3xl font-bold tracking-tight text-violet-400 tabular-nums">
              {tracking.rankHistory.length}
            </p>
            <p className="text-[11px] text-muted-foreground/40 mt-1.5">
              {tracking.lastChecked
                ? new Date(tracking.lastChecked).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Never checked"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1.5 mb-6 overflow-x-auto pb-1"
          style={{ animationDelay: "200ms" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                  : "border border-white/8 bg-white/3 text-muted-foreground/60 hover:border-white/15 hover:text-foreground hover:bg-white/5"
              }`}
              style={activeTab === tab.id ? { color: "white" } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div key={activeTab}>
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Ranking Chart */}
              <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6">
                <h3 className="text-sm font-semibold tracking-tight text-foreground mb-5 flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-400" />
                  Ranking History
                </h3>
                {tracking.rankHistory.filter((h) => h.position !== null)
                  .length > 0 ? (
                  <div className="relative" style={{ height: "300px" }}>
                    <canvas
                      ref={chartRef}
                      style={{ width: "100%", height: "100%" }}
                      className="rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground/40">
                    <Calendar size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No ranking data yet. Check back after the daily tracking
                      runs.
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/30 mt-3 text-center tracking-tight">
                  ↑ Lower position number = higher rank · Updated daily at 6:00
                  AM UTC
                </p>
              </div>

              {/* Top Competitors Preview */}
              {tracking.competitors.length > 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Users size={16} className="text-violet-400" />
                      Top Competitors
                    </h3>
                    <button
                      onClick={() => setActiveTab("competitors")}
                      className="text-xs font-medium text-indigo-400/70 hover:text-indigo-300 hover:underline underline-offset-2 transition-colors"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tracking.competitors.slice(0, 3).map((comp, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-3.5 rounded-xl border border-white/6 bg-white/2 px-4 py-3 hover:border-indigo-500/15 hover:bg-indigo-500/4 transition-all duration-200"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === 0
                              ? "bg-amber-500/12 text-amber-400 border border-amber-500/20"
                              : i === 1
                                ? "bg-white/6 text-muted-foreground/60 border border-white/10"
                                : "bg-orange-500/12 text-orange-400 border border-orange-500/20"
                          }`}
                        >
                          #{comp.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {comp.title || comp.domain}
                          </p>
                          <p className="text-xs text-muted-foreground/50 font-mono truncate mt-0.5">
                            {comp.domain}
                          </p>
                        </div>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/6 text-muted-foreground/40 hover:text-indigo-400 transition-all duration-150 shrink-0"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "competitors" && (
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6">
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-5 flex items-center gap-2">
                <Users size={16} className="text-violet-400" />
                Competitors for "{tracking.keyword}"
              </h3>
              {tracking.competitors.length > 0 ? (
                <div className="space-y-2">
                  {tracking.competitors.map((comp, i) => (
                    <div
                      key={i}
                      className="group flex items-start gap-4 rounded-xl border border-white/6 bg-white/2 px-4 py-3.5 hover:border-indigo-500/15 hover:bg-indigo-500/4 transition-all duration-200"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                          comp.position <= 3
                            ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                            : comp.position <= 10
                              ? "bg-indigo-500/12 text-indigo-400 border border-indigo-500/20"
                              : "bg-amber-500/12 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        #{comp.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {comp.title || "Untitled"}
                        </p>
                        <p className="text-xs text-indigo-400/60 font-mono mt-0.5">
                          {comp.domain}
                        </p>
                        {comp.snippet && (
                          <p className="text-xs text-muted-foreground/40 mt-1.5 line-clamp-2 leading-relaxed">
                            {comp.snippet}
                          </p>
                        )}
                      </div>
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/6 text-muted-foreground/40 hover:text-indigo-400 transition-all duration-150 shrink-0"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground/40">
                  <Users size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No competitor data available yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6">
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-5 flex items-center gap-2">
                <Clock size={16} className="text-violet-400" />
                Ranking History
              </h3>
              {tracking.rankHistory.length > 0 ? (
                <div className="space-y-2">
                  {[...tracking.rankHistory]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((entry, i) => (
                      <div
                        key={i}
                        className="group flex items-center gap-4 rounded-xl border border-white/6 bg-white/2 px-4 py-3.5 hover:border-indigo-500/15 hover:bg-indigo-500/4 transition-all duration-200"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            entry.position === null
                              ? "bg-white/4 text-muted-foreground/40 border border-white/8"
                              : entry.position <= 3
                                ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                                : entry.position <= 10
                                  ? "bg-indigo-500/12 text-indigo-400 border border-indigo-500/20"
                                  : entry.position <= 20
                                    ? "bg-amber-500/12 text-amber-400 border border-amber-500/20"
                                    : "bg-red-500/12 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {entry.position ? `#${entry.position}` : "—"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/80 tracking-tight">
                            {new Date(entry.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <div className="flex items-center gap-2.5 mt-0.5">
                            {entry.page && (
                              <span className="text-[11px] text-muted-foreground/40">
                                Page {entry.page}
                              </span>
                            )}
                            {entry.title && (
                              <span className="text-[11px] text-muted-foreground/40 truncate">
                                {entry.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-lg font-bold tabular-nums ${getPositionColor(entry.position)}`}
                          >
                            {entry.position || "N/R"}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground/40">
                  <Calendar size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    No history data yet. Data will appear after the first rank
                    check.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

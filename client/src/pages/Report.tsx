import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ScoreGauge from "../components/ScoreGauge";
import IssueCard from "../components/IssueCard";
import {
  ArrowLeft,
  Globe,
  Clock,
  FileText,
  Image,
  Link2,
  Heading,
  Tag,
  AlertCircle,
  ExternalLink,
  Type,
  BarChart3,
  Layers,
  Search,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface AnalysisData {
  _id: string;
  url: string;
  overallScore: number;
  status: string;
  createdAt: string;
  loadTime: number;
  pageSize: number;
  wordCount: number;
  categories: {
    seo: number;
    performance: number;
    accessibility: number;
    bestPractices: number;
  };
  metaData: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterCard: string;
    viewport: string;
    charset: string;
  };
  headings: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
    h1Texts: string[];
  };
  links: {
    internal: number;
    external: number;
    total: number;
  };
  images: {
    total: number;
    withoutAlt: number;
    withAlt: number;
  };
  keywords: { word: string; count: number; density: number }[];
  issues: {
    severity: string;
    category: string;
    message: string;
    recommendation: string;
  }[];
}

export default function Report() {
  const { api } = useApp();
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [downloading, setDownloading] = useState(false);

  const fetchAnalysis = async () => {
    try {
      const res = await api.get(`/api/analysis/${id}`);
      if (res.data.success) {
        if (res.data.analysis.status === "processing") {
          setTimeout(fetchAnalysis, 2000);
          return;
        }
        setAnalysis(res.data.analysis);
      } else {
        setError("Analysis Not Found");
      }
    } catch {
      setError("Failed to load analysis");
    }
    setLoading(false);
  };

  // ASYNC DOWNLOAD FILE STREAM HANDLER (Fetches Vector PDF directly from Express backend)
  const handleDownloadPDF = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      const response = await api.get(`/api/analysis/${id}/pdf`, {
        responseType: "blob", // CRITICAL: Forces Axios to expect binary stream data instead of JSON
      });

      // Convert raw binary chunks into a temporary browser download window URL context
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

      const filename = `SEO_Audit_Report_${new URL(analysis?.url || "").hostname}.pdf`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Failed to compile or fetch PDF document asset:", error);
      alert(
        "Could not extract PDF data from server. Please verify your backend route configurations.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const getScoreClass = (s: number) => {
    if (s >= 80) return "score-good";
    if (s >= 50) return "score-medium";
    return "score-poor";
  };

  const getScoreBgClass = (s: number) => {
    if (s >= 80) return "score-bg-good";
    if (s >= 50) return "score-bg-medium";
    return "score-bg-poor";
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "meta", label: "Meta Tags" },
    { id: "content", label: "Content" },
    { id: "issues", label: "Issues" },
  ];

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center bg-card border border-border rounded-2xl p-10">
          <AlertCircle size={48} className="mx-auto text-danger mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Report Not Found
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {error || "This analysis doesn't exist."}
          </p>
          <Link
            to="/dashboard"
            className="bg-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground inline-block"
            style={{ color: "var(--background)" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center bg-card border border-border rounded-2xl p-10">
          <AlertCircle size={48} className="mx-auto text-danger mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Analysis Failed
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            The AI model might be down. Please try again later.
          </p>
          <Link
            to="/analyze"
            className="bg-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground inline-block"
            style={{ color: "var(--background)" }}
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const criticalCount = analysis.issues.filter(
    (i) => i.severity === "critical",
  ).length;
  const warningCount = analysis.issues.filter(
    (i) => i.severity === "warning",
  ).length;
  const infoCount = analysis.issues.filter((i) => i.severity === "info").length;

  // Percentage Calculations
  const totalLinks = analysis.links.total || 1;
  const internalLinkPercentage = Math.round(
    (analysis.links.internal / totalLinks) * 100,
  );
  const externalLinkPercentage = Math.round(
    (analysis.links.external / totalLinks) * 100,
  );

  const totalImages = analysis.images.total || 1;
  const imageAltPercentage = Math.round(
    (analysis.images.withAlt / totalImages) * 100,
  );
  const imageMissingPercentage = Math.round(
    (analysis.images.withoutAlt / totalImages) * 100,
  );

  const maxKeywordCount = analysis.keywords.length
    ? Math.max(...analysis.keywords.map((k) => k.count))
    : 1;

  return (
    <div className="min-h-screen pt-16 md:pt-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Block with Integrated PDF Export Action Row */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium text-foreground truncate">
                {new URL(analysis.url).hostname}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <a
                  href={analysis.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary truncate flex items-center gap-1 transition-colors"
                >
                  {analysis.url}
                  <ExternalLink size={12} />
                </a>
                <span className="text-xs text-muted-foreground">
                  {new Date(analysis.createdAt).toLocaleDateString()} at{" "}
                  {new Date(analysis.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* HIGH-END PREMIUM EXPORT PDF TRIGGER BUTTON */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md self-start sm:self-center shrink-0 cursor-pointer disabled:opacity-50"
              style={{ color: "var(--background)" }}
            >
              <FileText size={14} />
              {downloading ? "Compiling..." : "Export PDF Report"}
            </button>
          </div>
        </div>

        {/* Score Gauge Widget Hero */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ScoreGauge
              score={analysis.overallScore}
              size={160}
              strokeWidth={12}
              label="Overall Score"
            />

            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "SEO",
                    value: analysis.categories.seo,
                    icon: <Search size={18} />,
                  },
                  {
                    label: "Performance",
                    value: analysis.categories.performance,
                    icon: <Clock size={18} />,
                  },
                  {
                    label: "Accessibility",
                    value: analysis.categories.accessibility,
                    icon: <Globe size={18} />,
                  },
                  {
                    label: "Best Practices",
                    value: analysis.categories.bestPractices,
                    icon: <Tag size={18} />,
                  },
                ].map((cat) => (
                  <div
                    key={cat.label}
                    className={`rounded-xl p-4 border text-center ${getScoreBgClass(cat.value)}`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-muted-foreground/80">
                      {cat.icon}
                      <span className="text-xs font-medium">{cat.label}</span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${getScoreClass(cat.value)}`}
                    >
                      {cat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Numerical Page Statistics */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">
                    {analysis.loadTime}ms
                  </p>
                  <p className="text-[10px] text-muted-foreground">Load Time</p>
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-secondary">
                    {Math.round(analysis.pageSize / 1024)}KB
                  </p>
                  <p className="text-[10px] text-muted-foreground">Page Size</p>
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-accent">
                    {analysis.wordCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Words</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Control Header */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              style={activeTab === tab.id ? { color: "var(--background)" } : {}}
            >
              {tab.label}
              {tab.id === "issues" && analysis.issues.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-danger/20 text-danger">
                  {analysis.issues.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Primary View Tab Switcher */}
        <div key={activeTab}>
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overview left column: Issue logs summaries */}
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-danger" />
                    Issues Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="severity-critical rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold">{criticalCount}</p>
                      <p className="text-xs mt-1">Critical</p>
                    </div>
                    <div className="severity-warning rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold">{warningCount}</p>
                      <p className="text-xs mt-1">Warnings</p>
                    </div>
                    <div className="severity-info rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold">{infoCount}</p>
                      <p className="text-xs mt-1">Info</p>
                    </div>
                  </div>
                </div>

                {analysis.issues.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.issues.slice(0, 2).map((issue, i) => (
                      <IssueCard key={i} issue={issue} />
                    ))}
                    {analysis.issues.length > 2 && (
                      <button
                        onClick={() => setActiveTab("issues")}
                        className="w-full text-center text-sm text-primary hover:underline py-2 mt-2 block"
                      >
                        View all {analysis.issues.length} issues →
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No problems found on your platform layout.
                  </p>
                )}
              </div>

              {/* Overview right column: Structural Graph Module Panel */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  Structure Analytics Graph
                </h3>

                {/* Graph Segment 1: Link Stack Counts Visibility */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={12} className="text-primary" /> Links Stack (
                      {analysis.links.total} total)
                    </span>
                    <span>
                      {internalLinkPercentage}% Internal /{" "}
                      {externalLinkPercentage}% External
                    </span>
                  </div>
                  <div className="w-full h-8 bg-muted/40 rounded-xl overflow-hidden flex p-1 border border-border/50">
                    <div
                      className="h-full rounded-lg bg-white transition-all duration-500 flex items-center justify-center text-[11px] font-bold text-slate-900 px-2"
                      style={{
                        width: `${internalLinkPercentage}%`,
                        minWidth: analysis.links.internal > 0 ? "50px" : "0%",
                      }}
                    >
                      {analysis.links.internal} Int
                    </div>
                    <div
                      className="h-full rounded-lg bg-slate-700 transition-all duration-500 flex items-center justify-center text-[11px] font-bold text-white px-2 ml-1"
                      style={{
                        width: `${externalLinkPercentage}%`,
                        minWidth: analysis.links.external > 0 ? "50px" : "0%",
                      }}
                    >
                      {analysis.links.external} Ext
                    </div>
                  </div>
                </div>

                {/* Graph Segment 2: Image Alt Text Validation Map */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Image size={12} className="text-accent" /> Alt
                      Descriptions ({analysis.images.total} total)
                    </span>
                    <span>{imageAltPercentage}% Validated</span>
                  </div>
                  <div className="w-full h-8 bg-muted/40 rounded-xl overflow-hidden flex p-1 border border-border/50">
                    <div
                      className="h-full rounded-lg bg-emerald-500 transition-all duration-500 flex items-center justify-center text-[11px] font-bold text-white px-2"
                      style={{
                        width: `${imageAltPercentage}%`,
                        minWidth: analysis.images.withAlt > 0 ? "50px" : "0%",
                      }}
                    >
                      {analysis.images.withAlt} Valid
                    </div>
                    <div
                      className="h-full rounded-lg bg-rose-500 transition-all duration-500 flex items-center justify-center text-[11px] font-bold text-white px-3 ml-1 min-w-[fit-content] whitespace-nowrap"
                      style={{ width: `${imageMissingPercentage}%` }}
                    >
                      {analysis.images.withoutAlt} Alert
                    </div>
                  </div>
                </div>

                {/* Graph Segment 3: Weight Distribution Balance Dashboard Panel */}
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
                    <Layers size={12} className="text-secondary" /> Weight
                    Distribution Balance
                  </p>
                  <div className="grid grid-cols-4 gap-4 h-32 items-end pt-4 pb-1 px-2 bg-muted/10 rounded-xl border border-border/30">
                    {[
                      {
                        name: "SEO",
                        val: analysis.categories.seo,
                        color: "bg-indigo-500",
                      },
                      {
                        name: "Perf",
                        val: analysis.categories.performance,
                        color: "bg-amber-500",
                      },
                      {
                        name: "Access",
                        val: analysis.categories.accessibility,
                        color: "bg-emerald-500",
                      },
                      {
                        name: "Rules",
                        val: analysis.categories.bestPractices,
                        color: "bg-cyan-500",
                      },
                    ].map((bar) => (
                      <div
                        key={bar.name}
                        className="flex flex-col items-center justify-end h-full group"
                      >
                        <span className="text-[11px] font-bold text-foreground mb-1">
                          {bar.val}
                        </span>
                        <div
                          className={`w-full ${bar.color} rounded-t-xl rounded-b-md transition-all duration-500 group-hover:brightness-115`}
                          style={{ height: `${bar.val}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium mt-1.5 truncate max-w-full">
                          {bar.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "meta" && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Meta Tags Analysis
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: "Title",
                    value: analysis.metaData.title,
                    ideal: "50-60 characters",
                    len: analysis.metaData.title?.length,
                  },
                  {
                    label: "Description",
                    value: analysis.metaData.description,
                    ideal: "150-160 characters",
                    len: analysis.metaData.description?.length,
                  },
                  {
                    label: "Canonical URL",
                    value: analysis.metaData.canonical,
                  },
                  { label: "Robots", value: analysis.metaData.robots },
                  { label: "Viewport", value: analysis.metaData.viewport },
                  { label: "Charset", value: analysis.metaData.charset },
                  { label: "OG Title", value: analysis.metaData.ogTitle },
                  {
                    label: "OG Description",
                    value: analysis.metaData.ogDescription,
                  },
                  { label: "OG Image", value: analysis.metaData.ogImage },
                  {
                    label: "Twitter Card",
                    value: analysis.metaData.twitterCard,
                  },
                ].map((meta) => (
                  <div
                    key={meta.label}
                    className="bg-muted/50 border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {meta.len !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {meta.len} chars
                          </span>
                        )}
                        <span
                          className={`w-2 h-2 rounded-full ${meta.value ? "bg-success" : "bg-danger"}`}
                        />
                      </div>
                    </div>
                    {meta.value ? (
                      <p className="text-sm text-muted-foreground break-all">
                        {meta.value}
                      </p>
                    ) : (
                      <p className="text-sm text-danger/60 italic">Missing</p>
                    )}
                    {meta.ideal && (
                      <p className="text-[10px] text-gray-600 mt-1">
                        Ideal: {meta.ideal}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "content" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content left column: Header Layout Bars */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Heading size={20} className="text-secondary" />
                  Heading Layout Distribution
                </h3>
                <div className="space-y-3">
                  {["h1", "h2", "h3", "h4", "h5", "h6"].map((tag) => {
                    const count = analysis.headings[
                      tag as keyof typeof analysis.headings
                    ] as number;
                    const maxBar = Math.max(
                      analysis.headings.h1,
                      analysis.headings.h2,
                      analysis.headings.h3,
                      analysis.headings.h4,
                      analysis.headings.h5,
                      analysis.headings.h6,
                      1,
                    );
                    const widthPercent = (count / maxBar) * 100;

                    return (
                      <div key={tag} className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-6 uppercase">
                          {tag}
                        </span>
                        <div className="flex-1 h-7 rounded-xl bg-muted/40 overflow-hidden p-1 border border-border/30 flex items-center">
                          <div
                            className="h-full rounded-lg bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                            style={{
                              width: `${widthPercent}%`,
                              minWidth: count > 0 ? "8px" : "0px",
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono font-bold w-8 text-right ${tag === "h1" && count !== 1 ? "text-danger" : "text-muted-foreground"}`}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {analysis.headings.h1Texts.length > 0 && (
                  <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Detected Main H1 Headers:
                    </p>
                    {analysis.headings.h1Texts.map((text, i) => (
                      <p
                        key={i}
                        className="text-sm text-foreground truncate font-medium"
                      >
                        “{text}”
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Content right column: Keyword Metrics Profile */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Type size={20} className="text-warning" />
                  Top Keyword Density Metrics
                </h3>
                {analysis.keywords.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.keywords.slice(0, 6).map((kw, i) => {
                      const frequencyRatio = (kw.count / maxKeywordCount) * 100;
                      return (
                        <div key={kw.word} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-foreground">
                              <span className="text-muted-foreground font-mono mr-1">
                                #{i + 1}
                              </span>{" "}
                              {kw.word}
                            </span>
                            <span className="text-muted-foreground">
                              {kw.count} occurrences ({kw.density}%)
                            </span>
                          </div>
                          <div className="w-full h-5 bg-muted/40 rounded-lg overflow-hidden p-0.5 border border-border/30 flex items-center">
                            <div
                              className="h-full rounded-md bg-warning/80 transition-all duration-500"
                              style={{ width: `${frequencyRatio}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No keyword data collected from this route.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "issues" && (
            <div>
              {analysis.issues.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                      Filter Elements:
                    </span>
                    <span className="severity-critical px-2.5 py-1 rounded-full text-xs font-semibold">
                      {criticalCount} Critical
                    </span>
                    <span className="severity-warning px-2.5 py-1 rounded-full text-xs font-semibold">
                      {warningCount} Warnings
                    </span>
                    <span className="severity-info px-2.5 py-1 rounded-full text-xs font-semibold">
                      {infoCount} Info
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysis.issues.map((issue, i) => (
                      <IssueCard key={i} issue={issue} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Issues Found!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your website follows standard SEO configurations smoothly.
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

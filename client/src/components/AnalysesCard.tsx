/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangleIcon, ClockIcon } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { Link } from "react-router-dom";

export default function AnalysesCard({ analysis }: { analysis: any }) {
  const getScoreClass = (s: number) => {
    if (s >= 80) return "score-good";
    if (s >= 50) return "score-medium";
    return "score-poor";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-emerald-500/10 border-emerald-500/15";
    if (s >= 50) return "bg-amber-500/10 border-amber-500/15";
    return "bg-red-500/10 border-red-500/15";
  };

  return (
    <Link
      key={analysis._id}
      to={`/report/${analysis._id}`}
      className="group relative flex flex-col rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 hover:-translate-y-0.5 hover:border-indigo-500/25 hover:bg-indigo-500/5 hover:shadow-xl hover:shadow-indigo-500/8 transition-all duration-300 ease-out"
    >
      {/* Top row: URL info + score/status */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground truncate group-hover:text-indigo-300 transition-colors duration-200">
            {new URL(analysis.url).hostname}
          </p>
          <p className="text-xs text-muted-foreground/50 truncate mt-0.5 font-mono">
            {analysis.url}
          </p>
        </div>

        {analysis.status === "completed" ? (
          <div className="shrink-0">
            <ScoreGauge
              score={analysis.overallScore}
              size={52}
              strokeWidth={4.5}
            />
          </div>
        ) : analysis.status === "processing" ? (
          <div className="w-12 h-12 rounded-xl border border-indigo-500/20 bg-indigo-500/8 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl border border-red-500/20 bg-red-500/8 flex items-center justify-center shrink-0">
            <AlertTriangleIcon size={16} className="text-red-400" />
          </div>
        )}
      </div>

      {/* Category score pills */}
      {analysis.status === "completed" && (
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {[
            { label: "SEO", value: analysis.categories.seo },
            { label: "Perf", value: analysis.categories.performance },
            { label: "A11y", value: analysis.categories.accessibility },
            { label: "BP", value: analysis.categories.bestPractices },
          ].map((c) => (
            <div
              key={c.label}
              className={`flex flex-col items-center py-1.5 rounded-lg border ${getScoreBg(c.value)}`}
            >
              <p
                className={`text-xs font-semibold tabular-nums ${getScoreClass(c.value)}`}
              >
                {c.value}
              </p>
              <p className="text-[9px] text-muted-foreground/50 font-medium mt-0.5 uppercase tracking-wide">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer: timestamp */}
      <div className="flex items-center gap-1.5 mt-auto pt-1 text-[11px] text-muted-foreground/40">
        <ClockIcon size={11} />
        <span className="tabular-nums">
          {new Date(analysis.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Subtle right-edge hover indicator */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  );
}

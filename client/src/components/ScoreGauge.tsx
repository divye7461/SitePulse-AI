interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ScoreGauge({
  score,
  size = 140,
  strokeWidth = 10,
  label,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const getColor = (s: number) => {
    if (s >= 80) return "#10b981";
    if (s >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getGlowColor = (s: number) => {
    if (s >= 80) return "rgba(16,185,129,0.25)";
    if (s >= 50) return "rgba(245,158,11,0.25)";
    return "rgba(239,68,68,0.25)";
  };

  const getTrackColor = (s: number) => {
    if (s >= 80) return "rgba(16,185,129,0.08)";
    if (s >= 50) return "rgba(245,158,11,0.08)";
    return "rgba(239,68,68,0.08)";
  };

  const color = getColor(score);
  const glowColor = getGlowColor(score);
  const trackColor = getTrackColor(score);

  // Font size scales proportionally but with a refined ratio
  const fontSize = size * 0.26;
  const labelSize = size * 0.13;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter:
            size >= 80
              ? `drop-shadow(0 0 ${size * 0.08}px ${glowColor})`
              : undefined,
        }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track circle — tinted, not flat gray */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition:
                "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1), stroke 1.5s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>

        {/* Score text — centered overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className="font-semibold tabular-nums leading-none tracking-tight"
            style={{ fontSize, color }}
          >
            {score}
          </span>
          {size >= 100 && (
            <span
              className="font-medium leading-none tracking-widest uppercase"
              style={{
                fontSize: labelSize,
                color: "var(--muted-foreground)",
                opacity: 0.5,
              }}
            >
              /100
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="text-xs font-medium text-muted-foreground/60 tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
}

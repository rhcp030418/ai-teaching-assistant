"use client";

interface RadarAxis {
  label: string;
  value: number; // 0~100
}

interface Props {
  axes: RadarAxis[];
  compareAxes?: RadarAxis[];
  compareLabel?: string;
}

const DISPLAY_ORDER = [
  "내용 이해",
  "자료·예시 도움",
  "질문·소통 편의",
  "학습 몰입",
];

const CHART_SIZE = 360;
const CENTER = CHART_SIZE / 2;
const DATA_RADIUS = 126;
const LABEL_RADIUS_X = 174;
const LABEL_RADIUS_Y = 166;

function shortLabel(label: string) {
  if (label.includes("자료")) return "자료";
  if (label.includes("이해")) return "이해";
  if (label.includes("소통")) return "소통";
  if (label.includes("몰입")) return "몰입";
  return label.replace(" 적절성", "");
}

function sortAxes(axes: RadarAxis[]) {
  return [...axes].sort((a, b) => {
    const ai = DISPLAY_ORDER.indexOf(a.label);
    const bi = DISPLAY_ORDER.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function point(index: number, total: number, value: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = DATA_RADIUS * Math.max(0.18, Math.min(1, value / 100));
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function polygonPoints(axes: RadarAxis[]) {
  return axes
    .map((axis, index) => {
      const p = point(index, axes.length, axis.value);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

export function RadarChart({ axes, compareAxes, compareLabel = "유사 분야 평균" }: Props) {
  if (axes.length < 3) return null;

  const displayAxes = sortAxes(axes);
  const displayCompare =
    compareAxes && compareAxes.length === axes.length ? sortAxes(compareAxes) : null;

  return (
    <div className="grid h-[420px] place-items-center">
      <div className="relative grid h-[360px] w-[360px] place-items-center">
        <div className="absolute h-[348px] w-[348px] rounded-full border border-[#1677FF]/[0.16]" />
        <div className="absolute h-[266px] w-[266px] rounded-full border border-[#1677FF]/[0.16]" />
        <div className="absolute h-[178px] w-[178px] rounded-full border border-[#1677FF]/[0.16]" />
        <div className="absolute h-[92px] w-[92px] rounded-full border border-[#1677FF]/[0.16]" />

        <svg
          viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
          className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_18px_18px_rgba(22,119,255,0.12)]"
          role="img"
          aria-label="학생 반응 지표 레이더 차트"
        >
          <defs>
            <linearGradient id="radarPreviewFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1677FF" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.42" />
            </linearGradient>
          </defs>
          {displayCompare && (
            <polygon
              points={polygonPoints(displayCompare)}
              fill="rgba(245,181,68,0.12)"
              stroke="#F5B544"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
          )}
          <polygon
            points={polygonPoints(displayAxes)}
            fill="url(#radarPreviewFill)"
            stroke="rgba(22,119,255,0.82)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>

        {displayAxes.map((axis, index) => {
          const angle = (Math.PI * 2 * index) / displayAxes.length - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * LABEL_RADIUS_X;
          const y = CENTER + Math.sin(angle) * LABEL_RADIUS_Y;
          return (
            <span
              key={axis.label}
              className="absolute rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-bold text-slate-500 shadow-[0_6px_14px_rgba(16,35,63,0.05)]"
              style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
            >
              {shortLabel(axis.label)}
            </span>
          );
        })}

        {displayCompare && (
          <div className="absolute -bottom-9 flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-[#1677FF]" />
              내 강의
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-[#F5B544]" />
              {compareLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

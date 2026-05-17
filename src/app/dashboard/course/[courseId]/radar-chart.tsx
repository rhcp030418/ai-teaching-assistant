"use client";

interface RadarAxis {
  label: string;
  value: number; // 0~100 (정규화된 값)
}

interface Props {
  axes: RadarAxis[];
  compareAxes?: RadarAxis[]; // 비교 다각형 (유사 분야 평균 등)
  compareLabel?: string;     // 범례 레이블
  size?: number;
}

export function RadarChart({ axes, compareAxes, compareLabel = "유사 분야 평균", size = 280 }: Props) {
  const n = axes.length;
  if (n < 3) return null;

  const padding = 52; // 라벨이 잘리지 않도록 여백 확보
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;

  // 각도 계산 (12시 방향부터 시계방향)
  function getPoint(index: number, r: number) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // 그리드 라인 (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // 데이터 포인트
  const dataPoints = axes.map((axis, i) => getPoint(i, (axis.value / 100) * radius));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  // 비교 데이터 포인트 (축 수가 같을 때만)
  const showCompare = compareAxes && compareAxes.length === n;
  const comparePoints = showCompare
    ? compareAxes!.map((axis, i) => getPoint(i, (axis.value / 100) * radius))
    : [];
  const comparePath = showCompare
    ? comparePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z"
    : "";

  return (
    <div className="flex flex-col items-center">
      {/* overflow-visible로 라벨이 SVG 경계 밖으로 나가도 잘리지 않게 */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* 그리드 */}
        {gridLevels.map((level) => {
          const points = Array.from({ length: n }, (_, i) => getPoint(i, level * radius));
          const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={level === 1.0 ? 1.5 : 0.8}
            />
          );
        })}

        {/* 축 라인 */}
        {axes.map((_, i) => {
          const p = getPoint(i, radius);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#e5e7eb"
              strokeWidth={0.8}
            />
          );
        })}

        {/* 비교 영역 (유사 분야 평균 — 내 데이터 아래에 그림) */}
        {showCompare && (
          <>
            <path d={comparePath} fill="rgba(249, 115, 22, 0.12)" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 3" />
            {comparePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill="none" stroke="#f97316" strokeWidth={1.5} />
            ))}
          </>
        )}

        {/* 내 데이터 영역 */}
        <path d={dataPath} fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth={2} />

        {/* 내 데이터 포인트 */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
        ))}

        {/* 라벨 */}
        {axes.map((axis, i) => {
          const labelOffset = 16;
          const p = getPoint(i, radius + labelOffset);
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          let textAnchor: "start" | "middle" | "end" = "middle";
          if (cosA > 0.15) textAnchor = "start";
          else if (cosA < -0.15) textAnchor = "end";

          // 위/아래 꼭짓점은 dy로 살짝 밀어 겹침 방지
          let dy = 0;
          if (sinA > 0.4) dy = 13;
          else if (sinA < -0.4) dy = -5;
          else dy = 4;

          return (
            <text
              key={i}
              x={p.x}
              y={p.y + dy}
              textAnchor={textAnchor}
              fontSize={11}
              className="fill-gray-600"
            >
              {axis.label}
            </text>
          );
        })}

        {/* 중앙 그리드 퍼센트 라벨 */}
        {[20, 60, 100].map((pct) => {
          const p = getPoint(0, (pct / 100) * radius);
          return (
            <text
              key={pct}
              x={p.x + 4}
              y={p.y - 4}
              className="fill-gray-400"
              fontSize={9}
            >
              {pct}%
            </text>
          );
        })}
      </svg>

      {/* 범례 */}
      {showCompare && (
        <div className="flex gap-4 justify-center mt-1 mb-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-block w-4 h-0.5 bg-blue-500 rounded" />
            내 강의
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-orange-400" />
            {compareLabel}
          </div>
        </div>
      )}

      {/* 수치 표시 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
        {axes.map((axis) => (
          <span key={axis.label} className="text-xs text-gray-500">
            {axis.label} <span className="font-semibold text-gray-700">{Math.round(axis.value)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

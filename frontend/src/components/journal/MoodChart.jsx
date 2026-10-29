import React, { useMemo, useState } from 'react';
import { formatDay } from './ui';

// One series (mood score per day), so the caption names it and no legend box is needed.
const W = 640;
const H = 240;
const M = { top: 16, right: 16, bottom: 28, left: 36 };
const Y_MIN = -10;
const Y_MAX = 10;
const Y_TICKS = [-10, -5, 0, 5, 10];

const moodWord = (score) => (score > 2 ? 'positive' : score < -2 ? 'heavy' : 'mixed');
const yFor = (v) => M.top + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * (H - M.top - M.bottom);

const MoodChart = ({ series }) => {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);

  const points = useMemo(() => {
    if (!series.length) return [];
    const innerW = W - M.left - M.right;
    const times = series.map((p) => new Date(`${p.date}T12:00:00`).getTime());
    const min = Math.min(...times);
    const span = Math.max(...times) - min || 1;

    return series.map((p, i) => ({
      ...p,
      x: M.left + (series.length === 1 ? innerW / 2 : ((times[i] - min) / span) * innerW),
      y: yFor(p.moodScore)
    }));
  }, [series]);

  const handleMove = (e) => {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    setHover(points.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), points[0]));
  };

  if (!series.length) {
    return <p className="text-primary/60 text-sm py-8 text-center">Write a few entries and your mood over time will show up here.</p>;
  }

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="space-y-2">
      <div className="flex items-center justify-between">
        <figcaption className="text-sm text-primary/70">Mood score by day (−10 heavy to +10 positive)</figcaption>
        <button className="text-xs text-primary/60 underline hover:text-primary" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-primary/60"><th className="py-1">Day</th><th>Mood score</th></tr></thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.date} className="border-t border-primary/10"><td className="py-1">{formatDay(p.date)}</td><td>{p.moodScore}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Mood over time, from ${first.moodScore} on ${first.date} to ${last.moodScore} on ${last.date}`}
          >
            {Y_TICKS.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={yFor(t)} y2={yFor(t)}
                  className={t === 0 ? 'stroke-primary/30' : 'stroke-primary/10'} strokeWidth="1" />
                <text x={M.left - 8} y={yFor(t) + 4} textAnchor="end" className="fill-primary/60" fontSize="11">{t}</text>
              </g>
            ))}

            <text x={first.x} y={H - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} className="fill-primary/60" fontSize="11">{formatDay(first.date)}</text>
            {points.length > 1 && <text x={last.x} y={H - 8} textAnchor="end" className="fill-primary/60" fontSize="11">{formatDay(last.date)}</text>}

            {points.length > 1 && (
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="stroke-primary"
              />
            )}

            {hover && <line x1={hover.x} x2={hover.x} y1={M.top} y2={H - M.bottom} className="stroke-primary/40" strokeDasharray="3 3" />}

            {points.map((p) => (
              <circle key={p.date} cx={p.x} cy={p.y} r={hover?.date === p.date ? 5 : 4}
                strokeWidth="2" className="fill-primary stroke-background" />
            ))}

            <rect x={M.left} y={M.top} width={W - M.left - M.right} height={H - M.top - M.bottom} fill="transparent"
              onPointerMove={handleMove} onPointerLeave={() => setHover(null)} />
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-lg bg-background border border-primary/20 shadow-soft text-xs text-primary whitespace-nowrap"
              style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100 - 3}%` }}
            >
              <div className="font-medium">{formatDay(hover.date)}</div>
              <div>Mood {hover.moodScore} ({moodWord(hover.moodScore)})</div>
            </div>
          )}
        </div>
      )}
    </figure>
  );
};

export default MoodChart;

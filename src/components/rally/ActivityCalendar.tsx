import { useMemo, useState } from "react";
import type { ActivityDay } from "@/lib/rally-store";

interface Props {
  days: ActivityDay[];
}

function shade(count: number): string {
  if (count <= 0) return "var(--muted)";
  if (count === 1) return "color-mix(in oklab, var(--primary) 22%, var(--muted))";
  if (count === 2) return "color-mix(in oklab, var(--primary) 50%, var(--muted))";
  if (count === 3) return "color-mix(in oklab, var(--primary) 78%, var(--muted))";
  return "var(--primary)";
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function ActivityCalendar({ days }: Props) {
  const [tip, setTip] = useState<{ day: ActivityDay; x: number; y: number } | null>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const first = new Date(days[0].date + "T00:00:00");
    const leadingBlanks = first.getDay();
    const grid: (ActivityDay | null)[] = [
      ...Array(leadingBlanks).fill(null),
      ...days,
    ];
    while (grid.length % 7 !== 0) grid.push(null);
    const weeks: (ActivityDay | null)[][] = [];
    for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      const firstDay = w.find((d) => d !== null) as ActivityDay | undefined;
      if (firstDay) {
        const m = new Date(firstDay.date + "T00:00:00").getMonth();
        if (m !== lastMonth) {
          labels.push({ col: i, label: MONTH_NAMES[m] });
          lastMonth = m;
        }
      }
    });
    return { weeks, monthLabels: labels };
  }, [days]);

  const cell = 11;
  const gap = 2;
  const cols = weeks.length;
  const width = cols * (cell + gap);
  const height = 7 * (cell + gap) + 14;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Activity
          </p>
          <p className="text-[13px] font-semibold mt-0.5">
            Last 4 months
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Less</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ backgroundColor: shade(n) }}
            />
          ))}
          <span className="uppercase tracking-wider">More</span>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar relative">
        <svg width={width} height={height} className="block">
          {monthLabels.map((m) => (
            <text
              key={`${m.col}-${m.label}`}
              x={m.col * (cell + gap)}
              y={10}
              fontSize="9"
              fill="currentColor"
              className="text-muted-foreground font-medium"
            >
              {m.label}
            </text>
          ))}
          <g transform={`translate(0, 14)`}>
            {weeks.map((w, ci) =>
              w.map((d, ri) => {
                if (!d) return null;
                return (
                  <rect
                    key={`${ci}-${ri}`}
                    x={ci * (cell + gap)}
                    y={ri * (cell + gap)}
                    width={cell}
                    height={cell}
                    rx={2}
                    fill={shade(d.count)}
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGElement).getBoundingClientRect();
                      const parent = (e.currentTarget as SVGElement)
                        .ownerSVGElement?.parentElement?.getBoundingClientRect();
                      if (parent) {
                        setTip({
                          day: d,
                          x: rect.left - parent.left + cell / 2,
                          y: rect.top - parent.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setTip(null)}
                    style={{ cursor: "pointer" }}
                  />
                );
              }),
            )}
          </g>
        </svg>
        {tip && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full mt-[-6px] rounded-sm bg-foreground text-background text-[10px] px-2 py-1 whitespace-nowrap num font-medium"
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.day.count} game{tip.day.count === 1 ? "" : "s"} ·{" "}
            {new Date(tip.day.date + "T00:00:00").toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

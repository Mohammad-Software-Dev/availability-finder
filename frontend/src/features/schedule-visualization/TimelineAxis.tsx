import { getScaleX } from "./utils";
import type { TimelineDomain } from "./types";

type Props = {
  domain: TimelineDomain;
  width: number;
  height: number;
};

function formatHour(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours.toString().padStart(2, "0")}:00`;
}

export function TimelineAxis({ domain, width, height }: Props) {
  const tickStepHours = width >= 700 ? 1 : width >= 480 ? 2 : 3;
  const tickStepMinutes = tickStepHours * 60;
  const ticks: number[] = [];

  for (
    let minute = domain.start;
    minute <= domain.end;
    minute += tickStepMinutes
  ) {
    ticks.push(minute);
  }

  if (ticks[ticks.length - 1] !== domain.end) {
    ticks.push(domain.end);
  }

  return (
    <g>
      <line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke="currentColor" strokeOpacity="0.14" />
      {ticks.map((minute) => {
        const x = getScaleX(minute, domain, width);

        return (
          <g key={minute} transform={`translate(${x}, 0)`}>
            <line y1={height - 8} y2={height} stroke="currentColor" strokeOpacity="0.28" />
            <text
              y={12}
              textAnchor={minute === domain.start ? "start" : minute === domain.end ? "end" : "middle"}
              className="fill-muted-foreground text-[9px] sm:text-[10px]"
            >
              {formatHour(minute)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

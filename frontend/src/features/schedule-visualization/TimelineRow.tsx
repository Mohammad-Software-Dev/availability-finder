import type { FocusEvent, MouseEvent } from "react";
import type {
  TimelineDomain,
  TimelineInterval,
  TimelineRow as TimelineRowType,
} from "./types";
import { getScaleX } from "./utils";

type Props = {
  row: TimelineRowType;
  domain: TimelineDomain;
  labelWidth: number;
  width: number;
  y: number;
  rowHeight: number;
  onItemEnter: (
    event: MouseEvent<SVGElement> | FocusEvent<SVGElement>,
    item: TimelineInterval,
  ) => void;
  onItemLeave: () => void;
};

function focusableRectProps(
  item: TimelineInterval,
  onItemEnter: Props["onItemEnter"],
  onItemLeave: Props["onItemLeave"],
) {
  return {
    tabIndex: 0,
    role: "img" as const,
    "aria-label": item.ariaLabel,
    onMouseEnter: (event: MouseEvent<SVGElement>) => onItemEnter(event, item),
    onMouseMove: (event: MouseEvent<SVGElement>) => onItemEnter(event, item),
    onMouseLeave: onItemLeave,
    onFocus: (event: FocusEvent<SVGElement>) => onItemEnter(event, item),
    onBlur: onItemLeave,
  };
}

export function TimelineRow({
  row,
  domain,
  labelWidth,
  width,
  y,
  rowHeight,
  onItemEnter,
  onItemLeave,
}: Props) {
  const intervalHeight = rowHeight - 14;
  const intervalY = y + (rowHeight - intervalHeight) / 4;
  const timelineStartX = labelWidth;
  const rowWidth = timelineStartX + width;
  const workingRadius = Math.max(6, intervalHeight * 0.32);
  const freeHeight = intervalHeight - 6;
  const freeRadius = Math.max(6, freeHeight * 0.32);

  return (
    <g>
      <text
        x={0}
        y={y + 18}
        className="fill-foreground text-[12px] font-semibold"
      >
        {row.participantName}
      </text>
      <line
        x1={0}
        y1={y + rowHeight}
        x2={rowWidth}
        y2={y + rowHeight}
        stroke="currentColor"
        strokeOpacity="0.08"
      />

      {row.workingHours && (
        <rect
          data-testid={`working-${row.participantId}`}
          x={timelineStartX + getScaleX(row.workingHours.start, domain, width)}
          y={intervalY}
          width={
            getScaleX(row.workingHours.end, domain, width) -
            getScaleX(row.workingHours.start, domain, width)
          }
          height={intervalHeight}
          rx={workingRadius}
          className="fill-slate-200/70"
        />
      )}

      {row.freeIntervals.map((interval) => (
        <rect
          key={interval.id}
          x={timelineStartX + getScaleX(interval.start, domain, width)}
          y={intervalY + 3}
          width={
            getScaleX(interval.end, domain, width) -
            getScaleX(interval.start, domain, width)
          }
          height={freeHeight}
          rx={freeRadius}
          className="fill-emerald-100/75"
        />
      ))}

      {row.busyIntervals.map((interval) => {
        const x = timelineStartX + getScaleX(interval.start, domain, width);
        const normalizedWidth =
          getScaleX(interval.end, domain, width) -
          getScaleX(interval.start, domain, width);

        return (
          <rect
            key={interval.id}
            data-testid={`busy-${row.participantId}-${interval.id}`}
            x={x}
            y={intervalY}
            width={normalizedWidth}
            height={intervalHeight}
            rx={workingRadius}
            className="fill-sky-500/85 stroke-sky-700 outline-none focus-visible:stroke-slate-900 focus-visible:stroke-[2.5]"
            strokeWidth={1}
            {...focusableRectProps(interval, onItemEnter, onItemLeave)}
          />
        );
      })}
    </g>
  );
}

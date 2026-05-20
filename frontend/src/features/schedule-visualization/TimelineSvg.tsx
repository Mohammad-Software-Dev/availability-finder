import type { FocusEvent, MouseEvent } from "react";
import type {
  ScheduleVisualizationModel,
  TimelineInterval,
} from "./types";
import { TimelineAxis } from "./TimelineAxis";
import { TimelineDensityBand } from "./TimelineDensityBand";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineRow } from "./TimelineRow";
import { getScaleX } from "./utils";

const LABEL_COLUMN_WIDTH = 148;
const HEADER_TOP_GAP = 8;
const AXIS_HEIGHT = 26;
const DENSITY_HEIGHT = 18;
const SLOT_STRIP_HEIGHT = 30;
const ROW_HEIGHT = 42;
const ROW_GAP = 6;
const PADDING_X = 16;
const PADDING_Y = 14;
const SHARED_WINDOW_BOTTOM_BLEED = 8;
const SHARED_WINDOW_RADIUS = 10;

type Props = {
  width: number;
  model: ScheduleVisualizationModel;
  onItemEnter: (
    event: MouseEvent<SVGElement> | FocusEvent<SVGElement>,
    item: TimelineInterval,
  ) => void;
  onItemLeave: () => void;
};

function focusableOverlayProps(
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

export function TimelineSvg({ width, model, onItemEnter, onItemLeave }: Props) {
  const timelineWidth = Math.max(
    width - LABEL_COLUMN_WIDTH - PADDING_X * 2,
    140,
  );
  const rowsHeight = model.rows.length * (ROW_HEIGHT + ROW_GAP);
  const chartHeight =
    HEADER_TOP_GAP +
    AXIS_HEIGHT +
    DENSITY_HEIGHT +
    SLOT_STRIP_HEIGHT +
    rowsHeight +
    PADDING_Y * 2;
  const timelineOffsetX = LABEL_COLUMN_WIDTH;
  const rowsStartY =
    PADDING_Y +
    HEADER_TOP_GAP +
    AXIS_HEIGHT +
    DENSITY_HEIGHT +
    SLOT_STRIP_HEIGHT;
  const sharedHeight = model.rows.length * (ROW_HEIGHT + ROW_GAP);
  const sharedWindowHeight = sharedHeight + SHARED_WINDOW_BOTTOM_BLEED;
  const slotTrackHeight = SLOT_STRIP_HEIGHT - 8;
  const slotTrackRadius = Math.max(8, slotTrackHeight * 0.28);
  const slotHeight = SLOT_STRIP_HEIGHT - 10;
  const slotRadius = Math.max(8, slotHeight * 0.32);

  return (
    <svg
      viewBox={`0 0 ${width} ${chartHeight}`}
      width="100%"
      height={chartHeight}
      role="img"
      aria-label="Scheduling timeline visualization"
      className="overflow-visible"
    >
      <g transform={`translate(${PADDING_X}, ${PADDING_Y})`}>
        <g transform={`translate(${timelineOffsetX}, ${HEADER_TOP_GAP})`}>
          <TimelineAxis
            domain={model.domain}
            width={timelineWidth}
            height={AXIS_HEIGHT}
          />

          <text
            x={-LABEL_COLUMN_WIDTH}
            y={AXIS_HEIGHT + 12}
            className="fill-slate-700 text-[10px] font-medium uppercase tracking-[0.14em]"
          >
            Availability overlap
          </text>

          <g transform={`translate(0, ${AXIS_HEIGHT})`}>
            <TimelineDensityBand
              buckets={model.density}
              domain={model.domain}
              width={timelineWidth}
              height={DENSITY_HEIGHT}
            />
          </g>

          <g transform={`translate(0, ${AXIS_HEIGHT + DENSITY_HEIGHT})`}>
            <rect
              x={0}
              y={4}
              width={timelineWidth}
              height={slotTrackHeight}
              rx={slotTrackRadius}
              className="fill-slate-100"
            />
            <text
              x={-LABEL_COLUMN_WIDTH}
              y={19}
              className="fill-slate-700 text-[10px] font-medium uppercase tracking-[0.14em]"
            >
              Suggested slots
            </text>

            {model.slots.map((slot) => {
              const x = getScaleX(slot.start, model.domain, timelineWidth);
              const slotWidth =
                getScaleX(slot.end, model.domain, timelineWidth) - x;

              return (
                <rect
                  key={slot.id}
                  data-testid={`slot-${slot.id}`}
                  x={x}
                  y={5}
                  width={slotWidth}
                  height={slotHeight}
                  rx={slotRadius}
                  className="fill-emerald-300/65 stroke-emerald-700 outline-none focus-visible:stroke-slate-900 focus-visible:stroke-[2.5]"
                  strokeWidth={1.4}
                  {...focusableOverlayProps(slot, onItemEnter, onItemLeave)}
                />
              );
            })}
          </g>

          <g
            transform={`translate(0, ${AXIS_HEIGHT + DENSITY_HEIGHT + SLOT_STRIP_HEIGHT})`}
          >
            <TimelineGrid
              domain={model.domain}
              width={timelineWidth}
              height={sharedHeight}
            />

            {model.sharedWindow && (
              <rect
                data-testid="shared-window"
                x={getScaleX(
                  model.sharedWindow.start,
                  model.domain,
                  timelineWidth,
                )}
                y={0}
                width={
                  getScaleX(
                    model.sharedWindow.end,
                    model.domain,
                    timelineWidth,
                  ) -
                  getScaleX(
                    model.sharedWindow.start,
                    model.domain,
                    timelineWidth,
                  )
                }
                height={sharedWindowHeight}
                rx={SHARED_WINDOW_RADIUS}
                className="fill-violet-200/35 stroke-violet-400"
                strokeWidth={1}
              />
            )}
          </g>
        </g>

        {model.rows.map((row, index) => (
          <g
            key={row.participantId}
            transform={`translate(0, ${rowsStartY + index * (ROW_HEIGHT + ROW_GAP)})`}
          >
            <TimelineRow
              row={row}
              domain={model.domain}
              labelWidth={LABEL_COLUMN_WIDTH}
              width={timelineWidth}
              y={0}
              rowHeight={ROW_HEIGHT}
              onItemEnter={onItemEnter}
              onItemLeave={onItemLeave}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

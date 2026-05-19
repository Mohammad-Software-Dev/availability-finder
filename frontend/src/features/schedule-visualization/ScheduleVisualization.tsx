import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, MouseEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AvailabilityResponse, PersonWithEvents } from "@/types";
import { TimelineSvg } from "./TimelineSvg";
import { TimelineTooltip } from "./TimelineTooltip";
import type {
  TimelineInterval,
  TimelineTooltipData,
} from "./types";
import { buildVisualizationModel } from "./utils";

type Props = {
  people: PersonWithEvents[];
  availability: AvailabilityResponse | null;
  isStale: boolean;
};

const DEFAULT_WIDTH = 980;

function getTooltipCopy(item: TimelineInterval): string {
  return item.ariaLabel;
}

export function ScheduleVisualization({
  people,
  availability,
  isStale,
}: Props) {
  const [tooltip, setTooltip] = useState<TimelineTooltipData | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const summaryId = "schedule-visualization-summary";
  const titleId = "schedule-visualization-title";

  const model = useMemo(
    () => buildVisualizationModel(people, availability, isStale),
    [availability, isStale, people],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function updateWidth(nextWidth: number) {
      setWidth(Math.max(Math.round(nextWidth), 320));
    }

    updateWidth(node.clientWidth || DEFAULT_WIDTH);
    setContainerHeight(node.clientHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      updateWidth(entry.contentRect.width || node.clientWidth || DEFAULT_WIDTH);
      setContainerHeight(entry.contentRect.height || node.clientHeight || 0);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  function handleItemEnter(
    event: MouseEvent<SVGElement> | FocusEvent<SVGElement>,
    item: TimelineInterval,
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();

    setTooltip({
      id: item.id,
      text: getTooltipCopy(item),
      x: rect ? targetRect.left - rect.left : 0,
      y: rect ? targetRect.top - rect.top : 0,
    });
  }

  return (
    <section aria-labelledby={titleId} aria-describedby={summaryId} className="space-y-3">
      <div className="space-y-1">
        <h3 id={titleId} className="text-base font-semibold">
          Scheduling analysis
        </h3>
        <p className="text-sm text-muted-foreground">
          Inspect working hours, busy intervals, overlap density, shared
          availability, and suggested meeting slots for the current selection.
        </p>
      </div>

      <Card className="border-slate-200 bg-slate-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">
            Schedule timeline
          </CardTitle>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span>Busy = solid blue</span>
            <span>Shared = violet highlight</span>
            <span>Slots = green highlight</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStale && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Result overlays are hidden until you refresh availability.
            </div>
          )}

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <p className="rounded-md bg-white/70 px-3 py-2">
              {people.length} participant{people.length === 1 ? "" : "s"} visualized
            </p>
            <p className="rounded-md bg-white/70 px-3 py-2">
              Visible day:{" "}
              {`${String(Math.floor(model.domain.start / 60)).padStart(2, "0")}:${String(model.domain.start % 60).padStart(2, "0")} → ${String(Math.floor(model.domain.end / 60)).padStart(2, "0")}:${String(model.domain.end % 60).padStart(2, "0")}`}
            </p>
            <p className="rounded-md bg-white/70 px-3 py-2">
              {model.slots.length} slot{model.slots.length === 1 ? "" : "s"} highlighted
            </p>
          </div>

          <div
            ref={containerRef}
            className="relative w-full rounded-xl border border-slate-200/80 bg-white px-2 py-3 sm:px-4"
          >
            <TimelineSvg
              width={width}
              model={model}
              onItemEnter={handleItemEnter}
              onItemLeave={() => setTooltip(null)}
            />
            <TimelineTooltip
              tooltip={tooltip}
              containerWidth={width}
              containerHeight={Math.max(containerHeight, 320)}
            />
          </div>

          <p id={summaryId} className="sr-only">
            {model.srSummary}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

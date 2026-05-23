import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FocusEvent, MouseEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
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
const MOBILE_MIN_CHART_WIDTH = 760;

function getTooltipCopy(item: TimelineInterval): string {
  return item.ariaLabel;
}

export function ScheduleVisualization({
  people,
  availability,
  isStale,
}: Props) {
  const [tooltip, setTooltip] = useState<TimelineTooltipData | null>(null);
  const [viewportWidth, setViewportWidth] = useState(DEFAULT_WIDTH);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const summaryId = useId();

  const model = useMemo(
    () => buildVisualizationModel(people, availability, isStale),
    [availability, isStale, people],
  );
  const hasSubmittedVisualization = people.length > 0 && availability !== null;
  const chartWidth =
    viewportWidth < MOBILE_MIN_CHART_WIDTH
      ? MOBILE_MIN_CHART_WIDTH
      : viewportWidth;
  const isScrollableOnMobile = chartWidth > viewportWidth;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function updateWidth(nextWidth: number) {
      setViewportWidth(Math.max(Math.round(nextWidth), 320));
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
    <section aria-labelledby={titleId} aria-describedby={summaryId}>
      <Card className="border-slate-200 bg-slate-50/60">
        <CardHeader className="pb-2">
          <h2 id={titleId} className="font-heading text-xl leading-snug font-medium text-slate-900">
            Scheduling Analysis
          </h2>
          <CardDescription className="text-sm">
            Inspect working hours, busy intervals, overlap density, shared
            availability, and suggested meeting slots for the current
            selection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStale && hasSubmittedVisualization && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Result overlays are hidden until you refresh availability.
            </div>
          )}

          {hasSubmittedVisualization && (
            <>
              <div className="grid gap-2 text-sm text-slate-800 sm:grid-cols-3">
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
                {isScrollableOnMobile && (
                  <p className="mb-2 text-xs text-slate-600 sm:hidden">
                    Swipe horizontally to explore the full timeline.
                  </p>
                )}
                <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
                  <div style={{ width: chartWidth }}>
                    <TimelineSvg
                      width={chartWidth}
                      model={model}
                      onItemEnter={handleItemEnter}
                      onItemLeave={() => setTooltip(null)}
                    />
                  </div>
                </div>
                <TimelineTooltip
                  tooltip={tooltip}
                  containerWidth={viewportWidth}
                  containerHeight={Math.max(containerHeight, 320)}
                />
                <div className="border-t border-slate-200/80 pt-2">
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-700">
                    <LegendSwatch className="bg-emerald-100/75 ring-1 ring-emerald-200/80">
                      Working Hours
                    </LegendSwatch>
                    <LegendSwatch className="bg-sky-500/85 ring-1 ring-sky-700/80">
                      Busy
                    </LegendSwatch>
                    <LegendSwatch className="bg-violet-200/60 ring-1 ring-violet-400/70">
                      Shared Window
                    </LegendSwatch>
                    <LegendSwatch className="bg-emerald-300/75 ring-1 ring-emerald-700/80">
                      Available Slot
                    </LegendSwatch>
                    <LegendGradient label="Availability Overlap" />
                  </div>
                </div>
              </div>
            </>
          )}

          <p id={summaryId} className="sr-only">
            {model.srSummary}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

type LegendSwatchProps = {
  children: string;
  className: string;
};

function LegendSwatch({ children, className }: LegendSwatchProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-6 rounded-full ${className}`}
      />
      <span>{children}</span>
    </span>
  );
}

function LegendGradient({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
        <span>low</span>
        <span
          aria-hidden="true"
          className="h-2.5 w-16 rounded-full bg-linear-to-r from-slate-300 via-sky-400 to-emerald-400"
        />
        <span>high</span>
      </span>
    </span>
  );
}

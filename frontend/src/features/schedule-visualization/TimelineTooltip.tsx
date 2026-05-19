import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TimelineTooltipData } from "./types";

type Props = {
  tooltip: TimelineTooltipData | null;
  containerWidth: number;
  containerHeight: number;
};

const TOOLTIP_OFFSET = 12;

export function TimelineTooltip({
  tooltip,
  containerWidth,
  containerHeight,
}: Props) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const [renderedTooltip, setRenderedTooltip] = useState<TimelineTooltipData | null>(
    null,
  );
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (tooltip) {
      setRenderedTooltip(tooltip);
      setIsVisible(true);
      return;
    }

    setIsVisible(false);

    hideTimeoutRef.current = window.setTimeout(() => {
      setRenderedTooltip(null);
      hideTimeoutRef.current = null;
    }, 150);

    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [tooltip]);

  useLayoutEffect(() => {
    if (!renderedTooltip || !tooltipRef.current) return;

    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;

    const unclampedLeft = renderedTooltip.x + TOOLTIP_OFFSET;
    const unclampedTop = renderedTooltip.y + TOOLTIP_OFFSET;
    const left = Math.max(
      8,
      Math.min(unclampedLeft, containerWidth - tooltipWidth - 8),
    );
    const top = Math.max(
      8,
      Math.min(unclampedTop, containerHeight - tooltipHeight - 8),
    );

    setPosition({ left, top });
  }, [containerHeight, containerWidth, renderedTooltip]);

  if (!renderedTooltip) return null;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-20 max-w-64 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] leading-4 text-white opacity-0 shadow-sm transition-opacity",
        isVisible && "opacity-100",
      )}
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      <p>{renderedTooltip.text}</p>
    </div>
  );
}

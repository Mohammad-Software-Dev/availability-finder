import type { TimelineDensityBucket, TimelineDomain } from "./types";
import { cn } from "@/lib/utils";
import { getScaleX } from "./utils";

type Props = {
  buckets: TimelineDensityBucket[];
  domain: TimelineDomain;
  width: number;
  height: number;
};

export function TimelineDensityBand({
  buckets,
  domain,
  width,
  height,
}: Props) {
  return (
    <g aria-label="Availability overlap density band">
      {buckets.map((bucket) => {
        const x = getScaleX(bucket.start, domain, width);
        const bucketWidth = getScaleX(bucket.end, domain, width) - x;
        const ratio =
          bucket.totalCount === 0 ? 0 : bucket.availableCount / bucket.totalCount;
        const opacity = 0.14 + ratio * 0.56;

        return (
          <rect
            key={bucket.id}
            x={x}
            y={0}
            width={Math.max(bucketWidth, 1)}
            height={height}
            fill="currentColor"
            fillOpacity={opacity}
            className={cn(
              ratio === 1
                ? "text-emerald-500"
                : ratio >= 0.5
                  ? "text-sky-500"
                  : "text-slate-400",
            )}
          />
        );
      })}
    </g>
  );
}

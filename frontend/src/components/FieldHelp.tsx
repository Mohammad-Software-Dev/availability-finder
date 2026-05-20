import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  helper?: string;
  details?: string;
  className?: string;
  detailsClassName?: string;
};

export function FieldHelp({
  helper,
  details,
  className,
  detailsClassName,
}: Props) {
  const tooltipId = details
    ? `field-help-${details.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 leading-none text-muted-foreground align-baseline",
        className,
      )}
    >
      {helper ? <span>{helper}</span> : null}
      {details ? (
        <span className="group relative inline-flex shrink-0 align-middle leading-none">
          <button
            type="button"
            aria-label="Show field help"
            aria-describedby={tooltipId}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-slate-800 focus-visible:text-slate-800 focus-visible:outline-none"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <span
            id={tooltipId}
            role="tooltip"
            className={cn(
              "pointer-events-none absolute left-1/2 top-6 z-10 w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] leading-4 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
              detailsClassName,
            )}
          >
            {details}
          </span>
        </span>
      ) : null}
    </span>
  );
}

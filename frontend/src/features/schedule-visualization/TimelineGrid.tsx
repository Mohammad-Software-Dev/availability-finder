import type { TimelineDomain } from "./types";
import { getScaleX } from "./utils";

type Props = {
  domain: TimelineDomain;
  width: number;
  height: number;
};

export function TimelineGrid({ domain, width, height }: Props) {
  const hourMarks: number[] = [];

  for (let minute = domain.start; minute <= domain.end; minute += 60) {
    hourMarks.push(minute);
  }

  return (
    <g aria-hidden="true">
      {hourMarks.map((minute) => {
        const x = getScaleX(minute, domain, width);

        return (
          <line
            key={minute}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke="currentColor"
            strokeOpacity={minute === domain.start ? "0.12" : "0.08"}
          />
        );
      })}
    </g>
  );
}

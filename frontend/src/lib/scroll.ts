function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function scrollIntoViewRespectingMotion(
  element: Element | null,
  options: Omit<ScrollIntoViewOptions, "behavior"> = {},
) {
  element?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    ...options,
  });
}

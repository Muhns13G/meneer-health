import { useEffect, useRef, type RefObject } from "react";

export function useSteppedFlowFocus(
  stepKey: string | number,
  errorCount: number,
): Readonly<{
  headingRef: RefObject<HTMLHeadingElement | null>;
  errorSummaryRef: RefObject<HTMLDivElement | null>;
}> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef<string | number | undefined>(undefined);
  const previousErrorCount = useRef(0);

  useEffect(() => {
    const stepChanged = previousStep.current !== undefined && previousStep.current !== stepKey;
    const errorsAppeared = errorCount > 0 && errorCount !== previousErrorCount.current;

    if (errorsAppeared) errorSummaryRef.current?.focus();
    else if (stepChanged) headingRef.current?.focus();

    previousStep.current = stepKey;
    previousErrorCount.current = errorCount;
  }, [errorCount, stepKey]);

  return { headingRef, errorSummaryRef };
}

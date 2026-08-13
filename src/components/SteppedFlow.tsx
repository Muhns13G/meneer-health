export function StepProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const boundedCurrent = Math.min(Math.max(current, 1), total);
  return (
    <>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Step {boundedCurrent} of {total}: {label}
      </p>
      <div
        role="progressbar"
        aria-label="Consultation progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={boundedCurrent}
        aria-valuetext={`Step ${boundedCurrent} of ${total}: ${label}`}
        className="h-1 bg-surface"
      >
        <div
          className="h-full bg-gold transition-all duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.round((boundedCurrent / total) * 100)}%` }}
        />
      </div>
    </>
  );
}

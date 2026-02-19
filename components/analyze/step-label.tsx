"use client";

export function StepLabel({
  step,
  label,
  muted,
}: {
  step: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span
        className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {step}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">{label}</span>
    </div>
  );
}

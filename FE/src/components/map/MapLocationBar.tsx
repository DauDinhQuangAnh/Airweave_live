interface MapLocationBarProps {
  label: string;
  fallbackText: string;
  accuracy?: number | null;
  isRefining?: boolean;
}

const MapLocationBar = ({
  label,
  fallbackText,
  accuracy = null,
  isRefining = false,
}: MapLocationBarProps) => {
  return (
    <div className="px-3 py-2 bg-card/80 backdrop-blur-sm border-b border-border text-xs font-body text-muted-foreground z-10 flex items-center gap-2 flex-wrap">
      <span>📍 {label || fallbackText}</span>
      {typeof accuracy === 'number' && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          ±{accuracy}m
        </span>
      )}
      {isRefining && (
        <span className="text-[10px] text-amber-600">
          GPS refining...
        </span>
      )}
    </div>
  );
};

export default MapLocationBar;

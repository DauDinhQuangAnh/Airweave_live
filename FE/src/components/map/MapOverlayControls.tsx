import { Layers, CloudRainWind, Users, ToggleLeft, ToggleRight, Thermometer, Gauge, Grid3X3, ShieldAlert } from 'lucide-react';
import { WindyOverlay } from '@/hooks/use-windy-map';

const overlayOptions: { id: WindyOverlay; labelVi: string; labelEn: string; icon: React.ReactNode }[] = [
  { id: 'rainClouds', labelVi: 'Gió & Mưa', labelEn: 'Wind & Rain', icon: <CloudRainWind className="w-3.5 h-3.5" /> },
  { id: 'temp', labelVi: 'Nhiệt độ', labelEn: 'Temp', icon: <Thermometer className="w-3.5 h-3.5" /> },
  { id: 'pressure', labelVi: 'Áp suất', labelEn: 'Pressure', icon: <Gauge className="w-3.5 h-3.5" /> },
];

export type MapLayerKey = 'community' | 'micro' | 'civic';

interface MapOverlayControlsProps {
  lang: 'vi' | 'en';
  activeOverlay: WindyOverlay;
  onOverlayChange: (overlay: WindyOverlay) => void;
  layers: { community: boolean; micro: boolean; civic: boolean };
  onToggleLayer: (key: MapLayerKey) => void;
}

function LayerToggle({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-semibold transition-colors shrink-0 ${
        active
          ? 'bg-primary/10 text-primary border border-primary/30'
          : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
      }`}
    >
      {icon}
      {label}
      {active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
    </button>
  );
}

const MapOverlayControls = ({ lang, activeOverlay, onOverlayChange, layers, onToggleLayer }: MapOverlayControlsProps) => {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-card/80 backdrop-blur-sm overflow-x-auto shrink-0 z-10">
      <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-heading font-semibold text-muted-foreground shrink-0">
        {lang === 'vi' ? 'Lớp bản đồ:' : 'Overlays:'}
      </span>

      {overlayOptions.map(opt => (
        <button
          key={opt.id}
          onClick={() => onOverlayChange(opt.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-semibold transition-colors shrink-0 ${
            activeOverlay === opt.id
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
          }`}
        >
          {opt.icon}
          {lang === 'vi' ? opt.labelVi : opt.labelEn}
        </button>
      ))}

      <div className="w-px h-5 bg-border shrink-0 mx-1" />

      <LayerToggle
        active={layers.community}
        onClick={() => onToggleLayer('community')}
        icon={<Users className="w-3.5 h-3.5" />}
        label={lang === 'vi' ? 'Cộng đồng' : 'Community'}
      />
      <LayerToggle
        active={layers.micro}
        onClick={() => onToggleLayer('micro')}
        icon={<Grid3X3 className="w-3.5 h-3.5" />}
        label={lang === 'vi' ? 'Vi vùng' : 'Micro air'}
      />
      <LayerToggle
        active={layers.civic}
        onClick={() => onToggleLayer('civic')}
        icon={<ShieldAlert className="w-3.5 h-3.5" />}
        label={lang === 'vi' ? 'Điểm nóng' : 'Civic hotspots'}
      />
    </div>
  );
};

export default MapOverlayControls;

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, MapPin, X, Clock, Trash2 } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const RECENTS_KEY = 'airweave_map_recent_searches_v1';
const MAX_RECENTS = 6;

export interface RecentLocation {
  id: string;
  name: string;
  place: string;
  lat: number;
  lng: number;
  ts: number;
}

interface Suggestion {
  id: string;
  name: string;
  place: string;
  lat: number;
  lng: number;
}

interface MapSearchBarProps {
  lang: 'vi' | 'en';
  onSelect: (lat: number, lng: number, label: string) => void;
}

function loadRecents(): RecentLocation[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function saveRecents(items: RecentLocation[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch { /* noop */ }
}

const MapSearchBar = ({ lang, onSelect }: MapSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [recents, setRecents] = useState<RecentLocation[]>(() => loadRecents());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        if (!MAPBOX_TOKEN) {
          setResults([]);
          setOpen(false);
          return;
        }
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=vn&limit=6&language=${lang}&types=place,locality,neighborhood,district,region,address,poi`;
        const r = await fetch(url, { signal: ctrl.signal });
        const j = await r.json();
        const items: Suggestion[] = (j.features ?? []).map((f: any) => ({
          id: f.id,
          name: f.text,
          place: f.place_name,
          lng: f.center[0],
          lat: f.center[1],
        }));
        setResults(items);
        setOpen(true);
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') console.warn('geocode err', err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, lang]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pushRecent = (s: Suggestion) => {
    const entry: RecentLocation = { ...s, ts: Date.now() };
    const next = [entry, ...recents.filter((r) => r.id !== s.id)].slice(0, MAX_RECENTS);
    setRecents(next);
    saveRecents(next);
  };

  const handleSelect = (s: Suggestion) => {
    pushRecent(s);
    onSelect(s.lat, s.lng, s.place);
    setQuery(s.place);
    setOpen(false);
  };

  const handlePickRecent = (r: RecentLocation) => {
    handleSelect({ id: r.id, name: r.name, place: r.place, lat: r.lat, lng: r.lng });
  };

  const clearRecents = () => {
    setRecents([]);
    saveRecents([]);
  };

  const showRecents = open && query.trim().length < 2 && recents.length > 0;
  const showResults = open && results.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={lang === 'vi' ? 'Tìm tỉnh, thành, quận, địa điểm...' : 'Search province, city, district, place...'}
          className="flex-1 bg-transparent outline-none text-sm font-body text-foreground placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
        {!loading && query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {(showResults || showRecents) && (
        <div className="absolute left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-lg overflow-hidden z-30 max-h-80 overflow-y-auto">
          {showRecents && (
            <>
              <div className="flex items-center justify-between px-3 py-2 text-[11px] font-heading font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lang === 'vi' ? 'Tìm gần đây' : 'Recent'}
                </span>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive normal-case tracking-normal"
                >
                  <Trash2 className="w-3 h-3" />
                  {lang === 'vi' ? 'Xóa' : 'Clear'}
                </button>
              </div>
              {recents.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handlePickRecent(r)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                >
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-heading font-semibold text-foreground truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.place}</div>
                  </div>
                </button>
              ))}
            </>
          )}
          {showResults && results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-heading font-semibold text-foreground truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground truncate">{r.place}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapSearchBar;

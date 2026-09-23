import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Car, Plug, ChevronDown, ExternalLink, Lock, Map as MapIcon, Search, Loader2, MapPin, X, Crosshair, Navigation, ShieldCheck, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MobilityHandoff from '@/components/smart-route/MobilityHandoff';
import { useLiveAirContext } from '@/contexts/live-air-context';
import AuroraBackground from '@/components/AuroraBackground';

interface PlaceSuggestion {
  id: string;
  name: string;
  place: string;
  lat: number;
  lng: number;
}

/**
 * Tìm địa điểm theo tên trên TOÀN Việt Nam qua Nominatim (OpenStreetMap).
 * OSM phủ POI (trường học, bệnh viện, ngõ ngách, địa chỉ cụ thể...) tốt hơn
 * hẳn Mapbox cho VN — nên tìm "Trường THCS Trảng Dài" ra đúng điểm.
 */
async function geocodePlaces(q: string, lang: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
    `&format=jsonv2&countrycodes=vn&limit=10&addressdetails=1&accept-language=${lang || 'vi'}`;
  const r = await fetch(url, { signal, headers: { 'Accept-Language': lang || 'vi' } });
  const arr = await r.json();
  if (!Array.isArray(arr)) return [];
  return arr.map((f: any): PlaceSuggestion => ({
    id: String(f.place_id),
    name: f.name || String(f.display_name || '').split(',')[0].trim(),
    place: f.display_name,
    lat: parseFloat(f.lat),
    lng: parseFloat(f.lon),
  }));
}

const MobilityHandoffPage = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location, requestLocation } = useLiveAirContext();
  const [toLabel, setToLabel] = useState('');
  const [toLat, setToLat] = useState<string>('');
  const [toLng, setToLng] = useState<string>('');
  const [showApi, setShowApi] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  // Điểm đi: mặc định dùng GPS; có thể tìm theo tên để đặt điểm đi thủ công
  const [manualOrigin, setManualOrigin] = useState<PlaceSuggestion | null>(null);
  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState<PlaceSuggestion[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [showOriginList, setShowOriginList] = useState(false);

  // Tìm điểm đến bằng tên địa điểm (geocoding Mapbox)
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<PlaceSuggestion[]>([]);
  const [searchingDest, setSearchingDest] = useState(false);
  const [showDestList, setShowDestList] = useState(false);

  // Chế độ hiển thị (card gọn) vs đang sửa (mở ô tìm)
  const [originEditing, setOriginEditing] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);

  const destLat = parseFloat(toLat);
  const destLng = parseFloat(toLng);
  const validDest = !isNaN(destLat) && !isNaN(destLng);

  // Điểm đi thực dùng cho handoff: ưu tiên điểm đi thủ công, nếu không thì GPS
  const gpsUsable = location.status === 'active' || location.status === 'manual';
  const originLat = manualOrigin ? manualOrigin.lat : location.lat;
  const originLng = manualOrigin ? manualOrigin.lng : location.lng;
  const originLabel = manualOrigin ? manualOrigin.name : location.label;
  const originReady = manualOrigin != null || gpsUsable;

  // Geocode điểm đến (debounce)
  useEffect(() => {
    const q = destQuery.trim();
    if (q.length < 3) { setDestResults([]); return; }
    setSearchingDest(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setDestResults(await geocodePlaces(q, lang, ctrl.signal));
        setShowDestList(true);
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') console.warn('geocode err', err);
      } finally {
        setSearchingDest(false);
      }
    }, 450);
    return () => { ctrl.abort(); window.clearTimeout(timer); };
  }, [destQuery, lang]);

  // Geocode điểm đi (debounce)
  useEffect(() => {
    const q = originQuery.trim();
    if (q.length < 3) { setOriginResults([]); return; }
    setSearchingOrigin(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setOriginResults(await geocodePlaces(q, lang, ctrl.signal));
        setShowOriginList(true);
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') console.warn('geocode err', err);
      } finally {
        setSearchingOrigin(false);
      }
    }, 450);
    return () => { ctrl.abort(); window.clearTimeout(timer); };
  }, [originQuery, lang]);

  const pickDest = (s: PlaceSuggestion) => {
    setToLabel(s.name);
    setToLat(String(s.lat));
    setToLng(String(s.lng));
    setDestQuery(s.place);
    setShowDestList(false);
  };

  const clearDest = () => {
    setToLabel('');
    setToLat('');
    setToLng('');
    setDestQuery('');
    setDestResults([]);
  };

  const pickOrigin = (s: PlaceSuggestion) => {
    setManualOrigin(s);
    setOriginQuery(s.place);
    setShowOriginList(false);
    setOriginEditing(false);
  };

  // Bấm "Dùng vị trí hiện tại": xin lại GPS và bỏ điểm đi thủ công
  const useCurrentGps = async () => {
    setGpsBusy(true);
    setManualOrigin(null);
    setOriginQuery('');
    setOriginResults([]);
    setOriginEditing(false);
    try {
      await requestLocation();
    } finally {
      setGpsBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#050911] text-white relative font-body p-4 md:p-6 space-y-6 scrollbar-thin">
      <AuroraBackground />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Top Header Card */}
        <div className="p-5 rounded-2xl bg-[#0a1120]/80 backdrop-blur-md border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading font-extrabold text-xl md:text-2xl text-white">
                  {lang === 'vi' ? 'Di chuyển & Đặt xe' : 'Mobility Handoff'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  SMART HANDOFF
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {lang === 'vi'
                  ? 'Chuyển tọa độ lộ trình sạch sang các ứng dụng gọi xe (Grab, Be, Xanh SM, Tada, Maps)'
                  : 'Transfer your clean route coordinates directly to Grab, Be, Xanh SM, Tada, or Maps'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'vi' ? 'Bảo mật tuyệt đối — Không gửi Medical ID' : 'Private — No Health Data Shared'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a1120]/80 backdrop-blur-md p-4 md:p-5 shadow-lg">
          <p className="text-sm font-heading font-bold text-foreground flex items-center gap-2 mb-4">
            <Navigation className="w-4 h-4 text-primary" />
            {lang === 'vi' ? 'Chọn điểm đi & điểm đến' : 'Choose origin & destination'}
          </p>

          <div className="flex gap-3">
            {/* Thanh nối điểm đi → điểm đến (kiểu app gọi xe) */}
            <div className="flex flex-col items-center pt-2 shrink-0">
              <span className="relative flex h-3.5 w-3.5">
                {gpsUsable && !manualOrigin && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                )}
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 ${originReady ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-900' : 'bg-muted border-border'}`} />
              </span>
              <span className="w-0.5 flex-1 my-1 min-h-[56px] rounded-full bg-gradient-to-b from-emerald-500/50 to-primary/60" />
              <MapPin className={`w-4 h-4 ${validDest ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>

            {/* Nội dung 2 điểm */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* ===== ĐIỂM ĐI ===== */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-heading font-bold text-emerald-600 dark:text-emerald-400">
                    {lang === 'vi' ? 'Điểm đi' : 'Origin'}
                  </span>
                  {!originEditing && originReady && (
                    <button
                      type="button"
                      onClick={() => setOriginEditing(true)}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-heading"
                    >
                      {lang === 'vi' ? 'Đổi điểm đi' : 'Change'}
                    </button>
                  )}
                </div>

                {!originEditing ? (
                  originReady ? (
                    // Card trạng thái điểm đi — NỔI BẬT
                    <div className={`rounded-xl border p-3 flex items-center gap-3 ${manualOrigin ? 'border-primary/30 bg-primary/5' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${manualOrigin ? 'bg-primary/15 text-primary' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                        {manualOrigin ? <MapPin className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-heading font-bold text-foreground truncate">{originLabel}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {manualOrigin ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-heading font-bold uppercase tracking-wide">
                              {lang === 'vi' ? 'Điểm đã chọn' : 'Custom'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-heading font-bold uppercase tracking-wide flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {lang === 'vi' ? 'Vị trí GPS' : 'GPS'}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono truncate">
                            {originLat.toFixed(4)}, {originLng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Chưa có điểm đi (GPS bị chặn)
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-body mb-2">
                        {lang === 'vi'
                          ? 'Chưa xác định điểm đi — trình duyệt chưa cho phép vị trí.'
                          : 'No origin — location not granted.'}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={useCurrentGps} disabled={gpsBusy} className="h-8 text-xs gap-1">
                          {gpsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                          {lang === 'vi' ? 'Dùng vị trí hiện tại' : 'Use GPS'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setOriginEditing(true)} className="h-8 text-xs gap-1">
                          <Search className="w-3.5 h-3.5" /> {lang === 'vi' ? 'Tìm điểm đi' : 'Search'}
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  // Chế độ sửa điểm đi: ô tìm + nút GPS
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        autoFocus
                        value={originQuery}
                        onChange={(e) => setOriginQuery(e.target.value)}
                        onFocus={() => originResults.length > 0 && setShowOriginList(true)}
                        className="pl-9 pr-9"
                        placeholder={lang === 'vi' ? 'Tìm điểm đi theo tên...' : 'Search origin by name...'}
                      />
                      {searchingOrigin ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                      ) : originQuery ? (
                        <button
                          type="button"
                          onClick={() => { setOriginQuery(''); setOriginResults([]); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="clear origin"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : null}

                      {showOriginList && originResults.length > 0 && (
                        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-64 overflow-y-auto">
                          {originResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => pickOrigin(s)}
                              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
                            >
                              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="text-sm font-heading font-semibold text-foreground truncate">{s.name}</div>
                                <div className="text-[11px] text-muted-foreground font-body truncate">{s.place}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={useCurrentGps} disabled={gpsBusy} className="h-8 text-xs gap-1 flex-1">
                        {gpsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                        {lang === 'vi' ? 'Dùng vị trí GPS' : 'Use GPS'}
                      </Button>
                      {originReady && (
                        <Button size="sm" variant="ghost" onClick={() => setOriginEditing(false)} className="h-8 text-xs">
                          {lang === 'vi' ? 'Xong' : 'Done'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== ĐIỂM ĐẾN ===== */}
              <div>
                <span className="text-[11px] uppercase tracking-wider font-heading font-bold text-primary block mb-1.5">
                  {lang === 'vi' ? 'Điểm đến' : 'Destination'}
                </span>

                {validDest ? (
                  // Card điểm đến đã chọn — NỔI BẬT
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-heading font-bold text-foreground truncate">
                        {toLabel || (lang === 'vi' ? 'Điểm đến' : 'Destination')}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {destLat.toFixed(4)}, {destLng.toFixed(4)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearDest}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-heading shrink-0"
                    >
                      {lang === 'vi' ? 'Đổi' : 'Change'}
                    </button>
                  </div>
                ) : (
                  // Ô tìm điểm đến
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={destQuery}
                      onChange={(e) => setDestQuery(e.target.value)}
                      onFocus={() => destResults.length > 0 && setShowDestList(true)}
                      className="pl-9 pr-9"
                      placeholder={lang === 'vi' ? 'Tìm điểm đến (vd: Bến Thành, Trường THCS...)' : 'Search destination...'}
                    />
                    {searchingDest ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                    ) : destQuery ? (
                      <button
                        type="button"
                        onClick={clearDest}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="clear"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}

                    {showDestList && destResults.length > 0 && (
                      <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-64 overflow-y-auto">
                        {destResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => pickDest(s)}
                            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
                          >
                            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-heading font-semibold text-foreground truncate">{s.name}</div>
                              <div className="text-[11px] text-muted-foreground font-body truncate">{s.place}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nhập toạ độ thủ công (tuỳ chọn) */}
                <button
                  type="button"
                  onClick={() => setShowManualCoords((v) => !v)}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-heading mt-2 flex items-center gap-1"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showManualCoords ? 'rotate-180' : ''}`} />
                  {lang === 'vi' ? 'Nhập toạ độ thủ công' : 'Enter coordinates manually'}
                </button>
                {showManualCoords && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input value={toLat} onChange={(e) => setToLat(e.target.value)} placeholder="dest lat (e.g. 21.0285)" />
                    <Input value={toLng} onChange={(e) => setToLng(e.target.value)} placeholder="dest lng (e.g. 105.8542)" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <MobilityHandoff
          lang={lang}
          origin={originReady ? { lat: originLat, lng: originLng, label: originLabel } : undefined}
          destination={validDest ? { lat: destLat, lng: destLng, label: toLabel } : undefined}
        />

        {/* Nhắc khi thiếu điểm đi hợp lệ mà đã có điểm đến */}
        {validDest && !originReady && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
            {lang === 'vi'
              ? 'Cần điểm đi hợp lệ để mở app: bấm "Dùng vị trí hiện tại" hoặc tìm điểm đi theo tên ở trên.'
              : 'A valid origin is required: click "Use current location" or search an origin above.'}
          </p>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#0a1120]/60 backdrop-blur-md p-4">
          <button
            type="button"
            onClick={() => setShowApi((v) => !v)}
            className="w-full flex items-center gap-2"
          >
            <Plug className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-heading font-bold text-foreground">
              {lang === 'vi' ? 'Future Clean Route Partner API' : 'Future Clean Route Partner API'}
            </span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {lang === 'vi' ? 'Chưa tích hợp' : 'Not active'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showApi ? 'rotate-180' : ''}`} />
          </button>
          {showApi && (
            <pre className="mt-3 text-[10px] bg-background/60 rounded p-3 overflow-x-auto font-mono text-muted-foreground">
{`// Future Clean Route Partner API — not active integration
{
  origin: { lat, lng },
  destination: { lat, lng },
  recommendedWaypoints: [{ lat, lng }, ...],
  avoidAQIHotspots: [...ids],
  avoidCommunityHotspots: [...ids],
  routeAirScore: 0..100,
  timestamp: ISO
}`}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobilityHandoffPage;

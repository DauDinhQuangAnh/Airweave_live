import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Car, Plug, ChevronDown, ExternalLink, Lock, Map as MapIcon, Search, Loader2, MapPin, X, Crosshair, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MobilityHandoff from '@/components/smart-route/MobilityHandoff';
import { useLiveAirContext } from '@/contexts/live-air-context';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';

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
    <FeatureExperienceLayout
      lang={lang}
      badge={lang === 'vi' ? 'Giải pháp' : 'Solution'}
      heading={lang === 'vi' ? 'Chuyển sang app di chuyển bạn đã có' : 'Hand off to your mobility app'}
      subheading={lang === 'vi'
        ? 'AirWeave không phải app gọi xe. Trang này chỉ chuyển điểm đi / điểm đến sang Grab, Be, Xanh SM, Tada, Google Maps, Apple Maps — bạn quyết định mở app nào.'
        : 'AirWeave is not a ride-hailing app. We only hand origin/destination off to Grab, Be, Xanh SM, Tada, Google Maps, Apple Maps.'}
      benefits={[
        { icon: <ExternalLink className="w-4 h-4" />, title: lang === 'vi' ? 'Mở ngoài 1 chạm' : '1-tap deep link', text: lang === 'vi' ? 'Tự động điền điểm đi / điểm đến vào app đối tác.' : 'Auto-fills origin/destination in partner apps.' },
        { icon: <MapIcon className="w-4 h-4" />, title: lang === 'vi' ? 'Đa nền tảng' : 'Multi-platform', text: lang === 'vi' ? 'Hỗ trợ Grab, Be, Xanh SM, Tada, Google Maps, Apple Maps.' : 'Supports Grab, Be, Xanh SM, Tada, Google & Apple Maps.' },
        { icon: <Lock className="w-4 h-4" />, title: lang === 'vi' ? 'Không chia sẻ hồ sơ' : 'No profile sharing', text: lang === 'vi' ? 'Medical ID và hồ sơ sức khoẻ không bao giờ gửi sang app khác.' : 'Medical ID and health profile are never forwarded.' },
      ]}
      chips={[lang === 'vi' ? 'Grab · Be · Xanh SM · Tada' : 'Grab · Be · Xanh SM · Tada', 'Google / Apple Maps', lang === 'vi' ? 'Mở ngoài ứng dụng' : 'External app']}
    >
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <header className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {lang === 'vi' ? 'Di chuyển & đặt xe' : 'Mobility Handoff'}
          </h1>
        </header>

        <p className="text-xs text-muted-foreground font-body">
          {lang === 'vi'
            ? 'AirWeave không phải app gọi xe. Trang này chuyển điểm đi/đến của bạn sang app khác (Grab, Be, Xanh SM, Tada, Google Maps, Apple Maps) để bạn tiếp tục di chuyển. Hồ sơ sức khoẻ và Medical ID không bao giờ được chia sẻ.'
            : 'AirWeave is not a ride-hailing app. This page hands your origin/destination to an external app (Grab, Be, Xanh SM, Tada, Google Maps, Apple Maps). Health profile and Medical ID are never shared.'}
        </p>

        <div className="rounded-2xl border border-border bg-card/80 p-4 md:p-5">
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

        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
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
    </FeatureExperienceLayout>
  );
};

export default MobilityHandoffPage;

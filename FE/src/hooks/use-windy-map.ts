import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type WindyOverlay = 'wind' | 'temp' | 'rainClouds' | 'pressure' | 'pm2p5';

interface UseWindyMapOptions {
  windyKey: string | null;
  lat: number;
  lng: number;
  initialOverlay?: WindyOverlay;
  lang?: 'vi' | 'en';
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // If script already exists, check if it's loaded
      if ((existing as HTMLScriptElement).dataset.loaded === 'true') {
        resolve();
        return;
      }
      // Wait for it to load
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function useWindyMap(containerRef: React.RefObject<HTMLDivElement>, options: UseWindyMapOptions) {
  const { windyKey, lat, lng, initialOverlay = 'wind', lang = 'vi' } = options;

  const [mapReady, setMapReady] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<WindyOverlay>(initialOverlay);
  const windyApiRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);
  const uiObserverRef = useRef<MutationObserver | null>(null);

  const lockWindyUi = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const hiddenSelectors = [
      '#bottom',
      '#mobile-ovr-select',
      '#embed-zoom',
      '#picker-mobile',
      '#plugin-rhpane',
      '#search',
      '#taskbar',
      '.product-board',
    ];

    hiddenSelectors.forEach((selector) => {
      container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
      });
    });

    const logoWrapper = container.querySelector<HTMLElement>('#logo-wrapper');
    if (logoWrapper) {
      logoWrapper.style.setProperty('top', 'auto', 'important');
      logoWrapper.style.setProperty('right', 'auto', 'important');
      logoWrapper.style.setProperty('bottom', '1rem', 'important');
      logoWrapper.style.setProperty('left', '1rem', 'important');
    }

    const logo = container.querySelector<HTMLElement>('#logo-wrapper #logo');
    if (logo) {
      logo.style.setProperty('left', '0', 'important');
    }
  }, [containerRef]);

  // Initialize Windy
  useEffect(() => {
    if (!windyKey || !containerRef.current || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    let cancelled = false;

    const init = async () => {
      try {
        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.4.0/dist/leaflet.css';
          document.head.appendChild(link);
        }

        await loadScript('https://unpkg.com/leaflet@1.4.0/dist/leaflet.js');
        await loadScript('https://api.windy.com/assets/map-forecast/libBoot.js');

        if (cancelled || !containerRef.current || !window.windyInit) return;

        const windyOptions = {
          key: windyKey,
          lat,
          lon: lng,
          zoom: 12,
          minZoom: 3,
          maxZoom: 19,
          overlay: activeOverlay,
          verbose: false,
        };

        window.windyInit(windyOptions, (windyAPI: any) => {
          if (cancelled) return;
          windyApiRef.current = windyAPI;
          leafletMapRef.current = windyAPI.map;
          const L = (window as any).L;
          // Ensure full gesture support (Windy disables some in embed mode)
          try {
            const map = windyAPI.map;
            map.scrollWheelZoom?.enable?.();
            map.doubleClickZoom?.enable?.();
            map.touchZoom?.enable?.();
            map.dragging?.enable?.();
            map.boxZoom?.enable?.();
            map.keyboard?.enable?.();
            // Replace hidden Windy zoom UI with native Leaflet zoom control
            if (L?.control?.zoom) {
              L.control.zoom({ position: 'topright' }).addTo(map);
            }
            if (L?.control?.scale) {
              L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);
            }
          } catch (e) {
            console.warn('windy gesture enable failed', e);
          }
          window.requestAnimationFrame(() => {
            windyAPI.map?.invalidateSize?.(false);
            windyAPI.picker?.close?.();
            lockWindyUi();
          });

          if (containerRef.current && typeof MutationObserver !== 'undefined') {
            uiObserverRef.current?.disconnect();
            uiObserverRef.current = new MutationObserver(() => {
              lockWindyUi();
            });
            uiObserverRef.current.observe(containerRef.current, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          }

          setMapReady(true);
        });
      } catch (err) {
        console.error('Windy init error:', err);
        if (!cancelled) {
          toast.error(lang === 'vi' ? 'Không thể tải bản đồ Windy' : 'Failed to load Windy map');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      uiObserverRef.current?.disconnect();
      uiObserverRef.current = null;
      // Allow re-init on remount (StrictMode double-invoke / route revisit)
      if (!windyApiRef.current) {
        initAttemptedRef.current = false;
      }
    };
  }, [containerRef, initialOverlay, lang, lat, lng, lockWindyUi, windyKey]);

  // Keep the map sized correctly without observing Windy's internal UI changes.
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    const map = leafletMapRef.current;
    const refreshSize = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize?.(false);
      });
    };

    const timer = window.setTimeout(refreshSize, 250);
    window.addEventListener('resize', refreshSize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', refreshSize);
    };
  }, [mapReady]);

  // Change overlay
  useEffect(() => {
    if (!windyApiRef.current) return;
    const { store, picker } = windyApiRef.current;
    if (store) {
      store.set('overlay', activeOverlay);
    }
    picker?.close?.();
    lockWindyUi();
  }, [activeOverlay, lockWindyUi]);

  // Pan map when location changes
  const panTo = useCallback((newLat: number, newLng: number, zoom = 13) => {
    const map = leafletMapRef.current;
    if (!map) return;

    const center = map.getCenter?.();
    const sameCenter = center
      && Math.abs(center.lat - newLat) < 0.0001
      && Math.abs(center.lng - newLng) < 0.0001;
    const sameZoom = typeof map.getZoom === 'function' ? map.getZoom() === zoom : false;

    if (sameCenter && sameZoom) return;

    map.setView([newLat, newLng], zoom, { animate: false });
  }, []);

  return {
    mapReady,
    activeOverlay,
    setActiveOverlay,
    leafletMap: leafletMapRef.current,
    windyApi: windyApiRef.current,
    panTo,
  };
}

export type { WindyOverlay };

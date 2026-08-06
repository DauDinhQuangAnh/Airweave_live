import { useState, useEffect } from 'react';

interface CityRanking {
  isInTop10: boolean;
  city: string;
  rank: number;
  aqi: number;
  source: string;
  url: string;
}

const VN_CITIES = [
  { name: 'Hanoi', nameVi: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
  { name: 'Ho Chi Minh City', nameVi: 'TP.HCM', lat: 10.8231, lng: 106.6297 },
];

const RANKING_URL = 'https://www.iqair.com/world-air-quality-ranking';

export function useGlobalRanking() {
  const [ranking, setRanking] = useState<CityRanking>({
    isInTop10: false,
    city: '',
    rank: 0,
    aqi: 0,
    source: 'WAQI',
    url: RANKING_URL,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        // Fetch AQI for major VN cities from WAQI
        const results = await Promise.all(
          VN_CITIES.map(async (city) => {
            try {
              const res = await fetch(
                `https://api.waqi.info/feed/geo:${city.lat};${city.lng}/?token=0406e1006b14313d5368c18ec5c372a1b29fa53a`
              );
              const data = await res.json();
              return {
                city: city.nameVi,
                aqi: data?.data?.aqi ?? 0,
              };
            } catch {
              return { city: city.nameVi, aqi: 0 };
            }
          })
        );

        // Find worst city
        const worst = results.reduce((a, b) => (a.aqi > b.aqi ? a : b));

        // AQI >= 150 is "Unhealthy" - likely top 10 globally
        // AQI >= 200 is "Very Unhealthy" - almost certainly top 10
        // We use 150 as threshold since cities with AQI 150+ are typically in global top 10
        const isInTop10 = worst.aqi >= 150;

        setRanking({
          isInTop10,
          city: worst.city,
          rank: worst.aqi >= 200 ? Math.min(3, Math.ceil((300 - worst.aqi) / 20)) : worst.aqi >= 150 ? Math.ceil((200 - worst.aqi) / 10) + 3 : 0,
          aqi: worst.aqi,
          source: 'WAQI',
          url: RANKING_URL,
        });
      } catch (err) {
        console.error('Global ranking fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
    const interval = setInterval(fetchRanking, 30 * 60 * 1000); // refresh every 30 min
    return () => clearInterval(interval);
  }, []);

  return { ranking, loading };
}

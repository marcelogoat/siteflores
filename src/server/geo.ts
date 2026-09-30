import { parseGeoLocation, parseIpLocation } from '../domain/geolocation';

type GeoInput = { ip?: string | null; city?: unknown; regionCode?: unknown; country?: unknown };
type GeoResult = { city: string; region: string };
type GeoFetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function resolveGeo(input: GeoInput, fetcher: GeoFetcher = fetch): Promise<GeoResult> {
  const ip = typeof input.ip === 'string' && input.ip.length <= 45 && /^[\da-fA-F:.]+$/.test(input.ip) ? input.ip : null;
  try {
    const response = await fetcher(ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : 'https://ipwho.is/', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5500),
    });
    if (!response.ok) throw new Error('Não foi possível consultar a cidade pelo IP.');
    const payload: unknown = await response.json();
    const { name, uf } = parseIpLocation(payload);
    return { city: name, region: uf };
  } catch {
    if (input.country !== 'BR') throw new Error('Não foi possível detectar uma cidade brasileira.');
    const { name, uf } = parseGeoLocation({ city: input.city, region: input.regionCode });
    return { city: name, region: uf };
  }
}

export async function geoResponse(input: GeoInput, fetcher: GeoFetcher = fetch): Promise<Response> {
  try {
    const result = await resolveGeo(input, fetcher);
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível detectar sua cidade.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

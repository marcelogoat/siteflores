import { parseGeoLocation, parseIpLocation } from '../domain/geolocation';

type GeoInput = { ip?: string | null; city?: unknown; regionCode?: unknown; country?: unknown };
type GeoResult = { city: string; region: string };
type GeoFetcher = (input: string, init?: RequestInit) => Promise<Response>;

function normalizeIp(value?: string | null): string | null {
  if (!value) return null;
  const ip = value.trim().replace(/^::ffff:/i, '').split('%')[0];
  return ip.length > 0 && ip.length <= 45 && /^[\da-fA-F:.]+$/.test(ip) ? ip : null;
}

function fromPlatform(input: GeoInput): GeoResult | null {
  if (String(input.country ?? '').toUpperCase() !== 'BR') return null;
  try {
    const { name, uf } = parseGeoLocation({ city: input.city, region: input.regionCode });
    return { city: name, region: uf };
  } catch {
    return null;
  }
}

export async function resolveGeo(input: GeoInput, fetcher: GeoFetcher = fetch): Promise<GeoResult> {
  const platform = fromPlatform(input);
  if (platform) return platform;
  const ip = normalizeIp(input.ip);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  const response = await fetcher(ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : 'https://ipwho.is/', {
    headers: { accept: 'application/json' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error('Não foi possível consultar a cidade pelo IP.');
  const payload: unknown = await response.json();
  const { name, uf } = parseIpLocation(payload);
  return { city: name, region: uf };
}

export async function geoResponse(input: GeoInput, fetcher: GeoFetcher = fetch): Promise<Response> {
  try {
    const result = await resolveGeo(input, fetcher);
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível detectar sua cidade.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

import { geoResponse } from '../../src/server/geo';

type GeoRequest = Request & { cf?: { city?: unknown; regionCode?: unknown; country?: unknown } };

export async function onRequestGet({ request }: { request: GeoRequest }): Promise<Response> {
  return geoResponse({
    ip: request.headers.get('CF-Connecting-IP'),
    city: request.cf?.city,
    regionCode: request.cf?.regionCode,
    country: request.cf?.country,
  });
}

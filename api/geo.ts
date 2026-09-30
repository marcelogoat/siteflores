import { geoResponse } from '../src/server/geo';

type HeaderValue = string | string[] | undefined;
type VercelRequest = { method?: string; headers: Record<string, HeaderValue> };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

const header = (value: HeaderValue) => Array.isArray(value) ? value[0] : value;
const decode = (value: HeaderValue) => {
  const text = header(value);
  if (!text) return undefined;
  try { return decodeURIComponent(text); } catch { return text; }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Método não permitido.');
    return;
  }
  const forwarded = header(req.headers['x-forwarded-for'])?.split(',')[0]?.trim();
  const response = await geoResponse({
    ip: header(req.headers['x-vercel-forwarded-for']) ?? forwarded,
    city: decode(req.headers['x-vercel-ip-city']),
    regionCode: header(req.headers['x-vercel-ip-country-region']),
    country: header(req.headers['x-vercel-ip-country']),
  });
  res.status(response.status);
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.send(await response.text());
}

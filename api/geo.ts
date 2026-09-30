export const config = { runtime: 'edge' };

const states = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });
const decode = (value: string | null) => {
  if (!value) return '';
  try { return decodeURIComponent(value).trim(); } catch { return value.trim(); }
};
const uf = (value: string | null) => decode(value).toUpperCase().match(/^(?:BR-)?([A-Z]{2})$/)?.[1] ?? '';

export default async function handler(request: Request) {
  if (request.method !== 'GET') return new Response('Método não permitido.', { status: 405 });
  try {
    const city = decode(request.headers.get('x-vercel-ip-city'));
    const region = uf(request.headers.get('x-vercel-ip-country-region'));
    const country = decode(request.headers.get('x-vercel-ip-country')).toUpperCase();
    if (country === 'BR' && city.length >= 2 && city.length <= 80 && states.has(region)) return json({ city, region });

    const forwarded = (request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().replace(/^::ffff:/i, '');
    const ip = forwarded && /^[\da-fA-F:.]+$/.test(forwarded) ? forwarded : '';
    const response = await fetch(ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : 'https://ipwho.is/', { headers: { accept: 'application/json' } });
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ error: 'Não foi possível detectar sua cidade.' }, 502);
    const data = payload as Record<string, unknown>;
    if (data.success !== true || String(data.country_code ?? '').toUpperCase() !== 'BR') return json({ error: 'Não foi possível detectar sua cidade.' }, 502);
    const name = typeof data.city === 'string' ? data.city.trim() : '';
    const code = uf(typeof data.region_code === 'string' ? data.region_code : null);
    if (!name || !states.has(code)) return json({ error: 'Não foi possível detectar sua cidade.' }, 502);
    return json({ city: name, region: code });
  } catch {
    return json({ error: 'Não foi possível detectar sua cidade.' }, 502);
  }
}

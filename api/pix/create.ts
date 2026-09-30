import { createPixResponse } from '../../src/server/pix';

type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Método não permitido.');
    return;
  }
  const request = new Request('https://vercel.local/api/pix/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body ?? {}),
  });
  const response = await createPixResponse(request, process.env.BLACKCAT_SECRET_KEY);
  res.status(response.status);
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.send(await response.text());
}

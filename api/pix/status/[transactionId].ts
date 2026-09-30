import { pixStatusResponse } from '../../../src/server/pix';

type QueryValue = string | string[] | undefined;
type VercelRequest = { method?: string; query: { transactionId?: QueryValue } };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Método não permitido.');
    return;
  }
  const value = req.query.transactionId;
  const transactionId = Array.isArray(value) ? value[0] : value ?? '';
  const response = await pixStatusResponse(transactionId, process.env.BLACKCAT_SECRET_KEY);
  res.status(response.status);
  response.headers.forEach((headerValue, name) => res.setHeader(name, headerValue));
  res.send(await response.text());
}

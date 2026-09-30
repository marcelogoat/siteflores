import { pixStatusResponse } from '../../../../src/server/pix';

type Env = { BLACKCAT_SECRET_KEY: string };

export function onRequestGet({ params, env }: { params: { transactionId?: string }; env: Env }): Promise<Response> {
  return pixStatusResponse(params.transactionId ?? '', env.BLACKCAT_SECRET_KEY);
}

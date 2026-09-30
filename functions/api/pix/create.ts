import { createPixResponse } from '../../../src/server/pix';

type Env = { BLACKCAT_SECRET_KEY?: string };

export function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  return createPixResponse(request, env.BLACKCAT_SECRET_KEY);
}

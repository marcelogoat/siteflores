import { productById } from '../domain/catalog';
import { validateCheckout, type CheckoutData } from '../domain/checkout';
import { isDeliveryMode } from '../domain/storage';
import { quote, type CartItem } from '../domain/commerce';

const API_URL = 'https://api.blackcatoficial.com/api';
export const gatewayKey = (provided?: string) => {
  const key = provided && provided.startsWith('sk_') ? provided : process.env.BLACKCAT_SECRET_KEY ?? '';
  if (!key.startsWith('sk_')) throw new Error('Gateway PIX não configurado.');
  return key;
};
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: jsonHeaders });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 200): value is string => typeof value === 'string' && value.length <= max;
const digits = (value: string) => value.replace(/\D/g, '');
const pickText = (source: Record<string, unknown>, keys: string[], max: number) => {
  for (const key of keys) if (text(source[key], max) && source[key].trim()) return source[key];
  return '';
};

type PixPayment = {
  transactionId: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  amount: number;
  invoiceUrl?: string;
  paymentData: { qrCode: string; qrCodeBase64: string; copyPaste: string; expiresAt: string };
};

function checkoutFrom(value: unknown): CheckoutData {
  if (!record(value)) throw new Error('Dados do checkout inválidos.');
  const keys: (keyof Omit<CheckoutData, 'mode'>)[] = ['nome', 'telefone', 'cpf', 'email', 'recebedor', 'mensagem', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'data', 'periodo'];
  const data: Record<string, string> = {};
  for (const key of keys) {
    if (!text(value[key])) throw new Error('Dados do checkout inválidos.');
    data[key] = value[key];
  }
  if (!isDeliveryMode(value.mode)) throw new Error('Modalidade de entrega inválida.');
  const checkout = { ...data, mode: value.mode } as CheckoutData;
  if (Object.keys(validateCheckout(checkout)).length) throw new Error('Confira os dados do checkout.');
  return checkout;
}

function cartFrom(value: unknown): CartItem[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('Sacola inválida.');
  return value.map((line) => {
    if (!record(line) || typeof line.productId !== 'number' || typeof line.quantity !== 'number' || !text(line.message)) throw new Error('Sacola inválida.');
    productById(line.productId);
    return { productId: line.productId, quantity: line.quantity, message: line.message };
  });
}

async function blackcat(path: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const key = gatewayKey(apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key, ...init?.headers },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function createPixResponse(request: Request, apiKey = ''): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const raw: unknown = await request.json();
    if (!record(raw) || !text(raw.orderId, 80) || !/^demo_[a-f0-9-]{36}$/.test(raw.orderId)) return json({ error: 'Pedido inválido.' }, 400);
    if (!text(raw.coupon, 40)) return json({ error: 'Cupom inválido.' }, 400);
    const checkout = checkoutFrom(raw.checkout);
    const cart = cartFrom(raw.cart);
    const extraCents = typeof raw.extraCents === 'number' && Number.isSafeInteger(raw.extraCents) && raw.extraCents >= 0 ? raw.extraCents : 0;
    const expectedBump = extraCents > 0 ? Math.round(productById(cart[0].productId).price_cents * .7) : 0;
    if (extraCents !== expectedBump) return json({ error: 'Oferta adicional inválida.' }, 400);
    const totals = quote(cart, checkout.mode, raw.coupon, extraCents);
    if (totals.total < 100 || totals.total > 10_000_000) return json({ error: 'Valor do pedido inválido.' }, 400);
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const upstream = await blackcat('/sales/create-sale', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        amount: totals.total,
        currency: 'BRL',
        paymentMethod: 'pix',
        items: [{ title: `Pedido de flores (${itemCount} ${itemCount === 1 ? 'item' : 'itens'})`, unitPrice: totals.total, quantity: 1, tangible: true }],
        customer: {
          name: checkout.nome.trim(),
          email: checkout.email.trim().toLowerCase(),
          phone: digits(checkout.telefone),
          document: { number: digits(checkout.cpf), type: 'cpf' },
        },
        shipping: {
          name: checkout.recebedor.trim(),
          street: checkout.endereco.trim(),
          number: checkout.numero.trim(),
          complement: checkout.complemento.trim(),
          neighborhood: checkout.bairro.trim(),
          city: checkout.cidade.trim(),
          state: checkout.estado,
          zipCode: digits(checkout.cep),
        },
        pix: { expiresInDays: 1 },
        externalRef: raw.orderId,
        metadata: JSON.stringify({ source: 'buque-de-rosas', deliveryMode: checkout.mode }),
      }),
    });
    const result: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok || !record(result) || result.success !== true || !record(result.data)) {
      return json({ error: 'O gateway não conseguiu gerar o PIX. Tente novamente.' }, upstream.status >= 400 && upstream.status < 500 ? 400 : 502);
    }
    const data = result.data;
    const paymentData = record(data.paymentData) ? data.paymentData : record(data.pix) ? data.pix : record(data.pixData) ? data.pixData : data;
    const transactionId = pickText(data, ['transactionId', 'transaction_id', 'id'], 120);
    const status = pickText(data, ['status'], 20) || 'PENDING';
    const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount);
    const copyPaste = pickText(paymentData, ['copyPaste', 'copy_paste', 'pixCopyPaste', 'pixCopiaECola', 'brCode', 'payload', 'emv', 'qrCode', 'qrcode', 'qr_code'], 10_000);
    const imageValue = pickText(paymentData, ['qrCodeBase64', 'qr_code_base64', 'base64', 'qrCodeImage', 'qrcodeImage'], 2_000_000);
    const qrCodeBase64 = /^data:image\/(?:png|jpeg|webp);base64,/i.test(imageValue) ? imageValue : /^[A-Za-z0-9+/=\s]+$/.test(imageValue) && imageValue.length > 100 ? `data:image/png;base64,${imageValue.replace(/\s/g, '')}` : '';
    const expiresValue = pickText(paymentData, ['expiresAt', 'expires_at', 'expirationDate', 'expiration_date'], 100);
    const expiresAt = Number.isFinite(Date.parse(expiresValue)) ? new Date(expiresValue).toISOString() : new Date(Date.now() + 86_400_000).toISOString();
    if (!transactionId || !Number.isSafeInteger(amount) || !copyPaste) {
      return json({ error: 'O gateway retornou um PIX incompleto.' }, 502);
    }
    const payment: PixPayment = {
      transactionId,
      status: status === 'PAID' ? 'PAID' : status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
      amount,
      invoiceUrl: text(data.invoiceUrl, 2_000) ? data.invoiceUrl : undefined,
      paymentData: {
        qrCode: copyPaste,
        qrCodeBase64,
        copyPaste,
        expiresAt,
      },
    };
    if (payment.amount !== totals.total) return json({ error: 'O gateway retornou um valor divergente.' }, 502);
    return json(payment, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Corpo da requisição inválido.' }, 400);
    if (error instanceof Error && /inválid|Confira|Cupom/.test(error.message)) return json({ error: error.message }, 400);
    return json({ error: error instanceof Error && error.message === 'Gateway PIX não configurado.' ? error.message : 'Não foi possível gerar o PIX agora.' }, 502);
  }
}

export async function pixStatusResponse(transactionId: string, apiKey = ''): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(transactionId)) return json({ error: 'Transação inválida.' }, 400);
  try {
    const upstream = await blackcat(`/sales/${encodeURIComponent(transactionId)}/status`, gatewayKey(apiKey));
    const result: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok || !record(result) || result.success !== true || !record(result.data) || !text(result.data.status, 20) || typeof result.data.amount !== 'number' || !Number.isSafeInteger(result.data.amount)) return json({ error: 'Não foi possível consultar o pagamento.' }, 502);
    const status = result.data.status;
    if (!['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'].includes(status)) return json({ error: 'Status de pagamento desconhecido.' }, 502);
    return json({ status, amount: result.data.amount });
  } catch {
    return json({ error: 'Não foi possível consultar o pagamento.' }, 502);
  }
}

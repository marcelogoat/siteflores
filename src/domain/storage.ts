import { productById } from './catalog';
import { deliveryModes, itemKey, quote, validateQuantity, type CartItem, type DeliveryMode } from './commerce';
import { states, type CheckoutData } from './checkout';
import type { PixPayment } from './pix';

export type Order = {
  id: string; createdAt: string; items: CartItem[]; coupon: string; mode: DeliveryMode;
  orderBump?: { productId: number; priceCents: number } | null;
  pix?: PixPayment;
  customer: Omit<CheckoutData, 'cpf'>; status: 'pending' | 'paid' | 'cancelled'; stage: number;
};
export type Ticket = { id: string; subject: string; message: string; email: string; createdAt: string };
export type StoreData = {
  version: 1; cart: CartItem[]; coupon: string; cardMessage: string; orders: Order[]; tickets: Ticket[];
  city: { name: string; uf: string } | null; profile: { name: string; email: string } | null;
};
export const STORAGE_KEY = 'rosa.frontend.v1';
export const emptyStore = (): StoreData => ({ version: 1, cart: [], coupon: '', cardMessage: '', orders: [], tickets: [], city: null, profile: null });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 200): value is string => typeof value === 'string' && value.length <= max;
const email = (value: unknown): value is string => text(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const date = (value: unknown): value is string => text(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export const isDeliveryMode = (value: unknown): value is DeliveryMode => typeof value === 'string' && Object.hasOwn(deliveryModes, value);

function isPixPayment(value: unknown): value is PixPayment {
  if (!record(value) || !text(value.transactionId, 120) || !['PENDING', 'PAID', 'CANCELLED'].includes(value.status as string) || typeof value.amount !== 'number' || !Number.isSafeInteger(value.amount) || value.amount < 0 || !record(value.paymentData)) return false;
  if (value.invoiceUrl !== undefined && !text(value.invoiceUrl, 2_000)) return false;
  return text(value.paymentData.qrCode, 10_000) && text(value.paymentData.qrCodeBase64, 2_000_000) && text(value.paymentData.copyPaste, 10_000) && date(value.paymentData.expiresAt);
}

function isCart(value: unknown): value is CartItem[] {
  if (!Array.isArray(value) || value.length > 500) return false;
  const keys = new Set<string>();
  return value.every((item: unknown) => {
    if (!record(item) || typeof item.productId !== 'number' || typeof item.quantity !== 'number' || !text(item.message)) return false;
    try { productById(item.productId); validateQuantity(item.quantity); } catch { return false; }
    const key = itemKey({ productId: item.productId, quantity: item.quantity, message: item.message });
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}
function isCustomer(value: unknown): value is Order['customer'] {
  if (!record(value)) return false;
  const keys = ['nome', 'telefone', 'email', 'recebedor', 'mensagem', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'data', 'periodo'];
  return keys.every((key) => text(value[key])) && email(value.email) && typeof value.estado === 'string' && states.includes(value.estado) && isDeliveryMode(value.mode);
}
function isOrder(value: unknown): value is Order {
  if (!record(value) || !text(value.id) || !/^demo_[a-f0-9-]{36}$/.test(value.id) || !date(value.createdAt) || !isCart(value.items) || !value.items.length || !isDeliveryMode(value.mode) || !isCustomer(value.customer) || value.mode !== value.customer.mode || !text(value.coupon)) return false;
  if (value.orderBump !== undefined && value.orderBump !== null && (!record(value.orderBump) || typeof value.orderBump.productId !== 'number' || typeof value.orderBump.priceCents !== 'number' || !Number.isSafeInteger(value.orderBump.priceCents) || value.orderBump.priceCents < 0)) return false;
  if (record(value.orderBump)) try { productById(value.orderBump.productId as number); } catch { return false; }
  if (value.pix !== undefined && !isPixPayment(value.pix)) return false;
  if (typeof value.status !== 'string' || !['pending', 'paid', 'cancelled'].includes(value.status) || !Number.isInteger(value.stage) || Number(value.stage) < 0 || Number(value.stage) > 4 || (value.status !== 'paid' && value.stage !== 0)) return false;
  try {
    const totals = quote(value.items, value.mode, value.coupon, record(value.orderBump) ? value.orderBump.priceCents as number : 0);
    if (isPixPayment(value.pix) && value.pix.amount !== totals.total) return false;
  } catch { return false; }
  return true;
}
function isTicket(value: unknown): value is Ticket {
  return record(value) && text(value.id) && /^ticket_[a-f0-9-]{36}$/.test(value.id) && text(value.subject) && value.subject.length > 0 && text(value.message, 2000) && value.message.length > 0 && email(value.email) && date(value.createdAt);
}
export function decodeStore(serialized: string): StoreData {
  const data: unknown = JSON.parse(serialized);
  const fail = () => { throw new Error('Os dados locais estão inválidos. Exporte ou limpe a demonstração para continuar.'); };
  if (!record(data)) return fail();
  const cardMessage = data.cardMessage === undefined ? '' : data.cardMessage;
  if (data.version !== 1 || !isCart(data.cart) || !text(data.coupon) || !text(cardMessage) || !Array.isArray(data.orders) || !data.orders.every(isOrder) || !Array.isArray(data.tickets) || !data.tickets.every(isTicket)) return fail();
  if (new Set(data.orders.map((order: Order) => order.id)).size !== data.orders.length) return fail();
  if (new Set(data.tickets.map((ticket: Ticket) => ticket.id)).size !== data.tickets.length) return fail();
  if (data.city !== null && (!record(data.city) || !text(data.city.name) || !data.city.name.trim() || !text(data.city.uf) || !states.includes(data.city.uf))) return fail();
  if (data.profile !== null && (!record(data.profile) || !text(data.profile.name) || !data.profile.name.trim() || !email(data.profile.email))) return fail();
  quote(data.cart, 'padrao', data.coupon);
  return { ...data, cardMessage } as StoreData;
}
export function createOrder(data: CheckoutData, cart: CartItem[], coupon: string, orderBump: Order['orderBump'] = null, id = `demo_${crypto.randomUUID()}`, pix?: PixPayment): Order {
  if (!cart.length) throw new Error('Sua sacola está vazia.');
  for (const item of cart) if (productById(item.productId).sold_out) throw new Error('Remova o produto esgotado antes de continuar.');
  quote(cart, data.mode, coupon, orderBump?.priceCents ?? 0);
  const { cpf: omittedCpf, ...customer } = data;
  void omittedCpf;
  if (!/^demo_[a-f0-9-]{36}$/.test(id)) throw new Error('Identificador do pedido inválido.');
  if (pix && pix.amount !== quote(cart, data.mode, coupon, orderBump?.priceCents ?? 0).total) throw new Error('Valor do PIX divergente.');
  return { id, createdAt: new Date().toISOString(), items: cart.map((item) => ({ ...item })), coupon, mode: data.mode, orderBump, pix, customer, status: pix?.status === 'PAID' ? 'paid' : 'pending', stage: 0 };
}
export function confirmPayment(order: Order): Order {
  if (order.status === 'cancelled') throw new Error('Este pedido foi cancelado.');
  return { ...order, status: 'paid' };
}
export function advanceOrder(order: Order): Order {
  if (order.status !== 'paid') throw new Error('Confirme o pagamento demonstrativo primeiro.');
  return { ...order, stage: Math.min(4, order.stage + 1) };
}

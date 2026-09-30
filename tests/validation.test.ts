import { expect, test } from 'bun:test';
import { products } from '../src/domain/catalog';
import { addItem, quote } from '../src/domain/commerce';
import { demoCheckout, validateCheckout } from '../src/domain/checkout';
import { advanceOrder, confirmPayment, createOrder, decodeStore, emptyStore } from '../src/domain/storage';

const available = products.find((item) => !item.sold_out)!;
const cart = addItem([], available.id);

test('mantém a mensagem do cartão da sacola e rejeita conteúdo acima de 200 caracteres', () => {
  const legacy = decodeStore(JSON.stringify(emptyStore()));
  expect(legacy.cardMessage).toBe('');
  const message = 'Feliz aniversário!';
  expect(decodeStore(JSON.stringify({ ...emptyStore(), cardMessage: message })).cardMessage).toBe(message);
  expect(() => decodeStore(JSON.stringify({ ...emptyStore(), cardMessage: 'x'.repeat(201) }))).toThrow();
});

test('rejeita JSON sintaticamente válido com quantidade semanticamente inválida', () => {
  expect(() => decodeStore(JSON.stringify({ ...emptyStore(), cart: [{ productId: available.id, quantity: -1, message: '' }] }))).toThrow();
});
test.each([0, -1, 1.5, 100, Number.NaN])('rejeita quantidade %s', (quantity) => {
  expect(() => addItem([], available.id, quantity)).toThrow();
});
test('não aceita produto inexistente, esgotado, mensagem longa ou acúmulo acima do limite', () => {
  expect(() => addItem([], -1)).toThrow();
  expect(() => addItem([], products.find((item) => item.sold_out)!.id)).toThrow();
  expect(() => addItem([], available.id, 1, 'x'.repeat(201))).toThrow();
  expect(() => addItem(addItem([], available.id, 99), available.id)).toThrow();
});
test('cupom aplica desconto em centavos sem descontar frete', () => {
  const totals = quote(cart, 'expressa', 'flores10');
  expect(totals.discount).toBe(Math.round(available.price_cents * 0.1));
  expect(totals.total).toBe(totals.subtotal - totals.discount + 1490);
  expect(() => quote(cart, 'padrao', 'INVALIDO')).toThrow();
});
test('checkout aceita dados demonstrativos e rejeita CPF repetido, UF inexistente e CEP inválido', () => {
  expect(validateCheckout(demoCheckout)).toEqual({});
  const errors = validateCheckout({ ...demoCheckout, cpf: '111.111.111-11', estado: 'XX', cep: '00000-000' });
  expect(errors.cpf).toBeDefined();
  expect(errors.estado).toBeDefined();
  expect(errors.cep).toBeDefined();
});
test('data impossível e passada são rejeitadas mesmo com formato válido', () => {
  expect(validateCheckout({ ...demoCheckout, mode: 'agendada', data: '2027-02-30', periodo: '08h às 12h' }, '2027-01-01').data).toBeDefined();
  expect(validateCheckout({ ...demoCheckout, mode: 'agendada', data: '2026-01-01', periodo: '08h às 12h' }, '2027-01-01').data).toBeDefined();
});
test('pedido não persiste CPF e pode completar o fluxo sem backend', () => {
  const order = createOrder(demoCheckout, cart, '');
  expect(order.customer).not.toHaveProperty('cpf');
  expect(order.status).toBe('pending');
  expect(() => advanceOrder(order)).toThrow();
  const paid = confirmPayment(order);
  expect(confirmPayment(paid)).toEqual(paid);
  let delivered = paid;
  for (let step = 0; step < 8; step++) delivered = advanceOrder(delivered);
  expect(delivered.stage).toBe(4);
  expect(decodeStore(JSON.stringify({ ...emptyStore(), orders: [delivered] })).orders[0]).toEqual(delivered);
  expect(() => confirmPayment({ ...order, status: 'cancelled' })).toThrow();
});
test('rejeita estados impossíveis e catálogo adulterado no armazenamento', () => {
  const order = createOrder(demoCheckout, cart, '');
  expect(() => decodeStore(JSON.stringify({ ...emptyStore(), orders: [{ ...order, stage: 2 }] }))).toThrow();
  expect(() => decodeStore(JSON.stringify({ ...emptyStore(), orders: [{ ...order, status: ['paid'] }] }))).toThrow();
  expect(() => decodeStore(JSON.stringify({ ...emptyStore(), cart: [{ productId: -999, quantity: 1, message: '' }] }))).toThrow();
  expect(() => decodeStore(JSON.stringify({ ...emptyStore(), city: { name: 'São Paulo', uf: 'INVALID' } }))).toThrow();
});

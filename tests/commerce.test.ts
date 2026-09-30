import { expect, test } from 'bun:test';
import { addItem, quote } from '../src/domain/commerce';
import { products } from '../src/domain/catalog';

test('a sacola acumula quantidades e calcula o preço canônico do catálogo', () => {
  const product = products.find((item) => !item.sold_out)!;
  const first = addItem([], product.id, 1, 'Com carinho');
  const cart = addItem(first, product.id, 2, 'Com carinho');
  expect(cart).toHaveLength(1);
  expect(cart[0].quantity).toBe(3);
  expect(quote(cart, 'padrao', '').total).toBe(product.price_cents * 3);
});

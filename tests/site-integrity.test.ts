import { expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { categories, filterProducts, occasions, products } from '../src/domain/catalog';
import icons from '../src/data/icons.json';
import institutional from '../src/data/institutional.json';

const files = [...new Bun.Glob('src/**/*.{ts,tsx,css}').scanSync('.')];

test('todas as ocasiões visíveis retornam produtos compatíveis', () => {
  for (const occasion of [...occasions, 'Romance', 'Gratidão']) {
    expect(filterProducts({ occasion }).length).toBeGreaterThan(0);
  }
  expect(filterProducts({ occasion: 'Ocasião inexistente' })).toEqual([]);
  expect(filterProducts({ occasion: 'Namorados' })).toEqual(filterProducts({ occasion: 'Romance' }));
  expect(filterProducts({ occasion: 'Dia das Mães' })).toEqual(filterProducts({ occasion: 'Gratidão' }));
  for (const product of filterProducts({ occasion: 'Gratidão' })) {
    expect(product.categories.some((category) => ['Orquídeas', 'Lisianthus', 'Cestas'].includes(category))).toBe(true);
  }
});

test('categorias possuem produtos e todos os recursos de catálogo são locais', () => {
  expect(products).toHaveLength(333);
  expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
  expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
  for (const category of categories) expect(filterProducts({ category }).length).toBeGreaterThan(0);
  for (const product of products) {
    expect(product.image.startsWith('/cdn/')).toBe(true);
    expect(statSync(join('public', product.image)).size).toBeGreaterThan(0);
    expect(Number.isSafeInteger(product.price_cents)).toBe(true);
    expect(product.price_cents).toBeGreaterThan(0);
  }
});

test('TSX é sintaticamente válido e todos os imports locais existem', () => {
  for (const file of files.filter((path) => /\.tsx?$/.test(path))) {
    const source = readFileSync(file, 'utf8');
    const transpiler = new Bun.Transpiler({ loader: file.endsWith('.tsx') ? 'tsx' : 'ts' });
    expect(() => transpiler.transformSync(source)).not.toThrow();
    const { imports } = transpiler.scan(source);
    for (const entry of imports) {
      const path = entry.path.split('?')[0];
      if (!path.startsWith('.') && !path.startsWith('@/')) continue;
      const target = path.startsWith('@/') ? resolve('src', path.slice(2)) : resolve(dirname(file), path);
      expect(['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx'].some((suffix) => existsSync(`${target}${suffix}`))).toBe(true);
    }
    for (const match of source.matchAll(/<Icon[^>]+name="([^"]+)"/g)) expect(Object.hasOwn(icons, match[1])).toBe(true);
    if (file.replaceAll('\\', '/').endsWith('/domain/geolocation.ts')) {
      expect(source.match(/fetch\(/g)).toEqual(['fetch(', 'fetch(']);
      expect([...source.matchAll(/https?:\/\/[^\s`"'?]+/g)].map(([url]) => url)).toEqual(['https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios']);
    } else if (file.replaceAll('\\', '/').endsWith('/server/geo.ts')) {
      expect([...source.matchAll(/https?:\/\/[^\s`"'?]+/g)].every(([url]) => url.startsWith('https://ipwho.is/'))).toBe(true);
    } else {
      expect(source).not.toMatch(/(?:fetch\(|https?:\/\/)/);
    }
  }
});

test('imagens e fontes declaradas em JSX e CSS existem no diretório público', () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const resources = [...source.matchAll(/(?:src=["']|url\(["']?)(\/[^"')\s]+)(?:["')])/g)];
    for (const [, resource] of resources) expect(statSync(join('public', resource)).size).toBeGreaterThan(0);
  }
});

test('conteúdo institucional não executa scripts nem aponta para canais externos', () => {
  for (const html of Object.values(institutional)) {
    expect(html).not.toMatch(/<script|<iframe|\bon\w+\s*=|javascript:/i);
    expect(html).not.toMatch(/(?:href|src)=["'](?:https?:|\/\/|mailto:|tel:)/i);
  }
});

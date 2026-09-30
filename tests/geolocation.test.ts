import { expect, test } from 'bun:test';
import { parseGeoLocation, parseCities } from '../src/domain/geolocation';
import { resolveGeo } from '../src/server/geo';

test('converte a cidade e UF retornadas por /api/geo', () => {
  expect(parseGeoLocation({ city: 'Curitiba', region: 'PR' })).toEqual({ name: 'Curitiba', uf: 'PR' });
});

test('rejeita JSON válido com UF semanticamente inválida', () => {
  const payload: unknown = JSON.parse('{"city":"Curitiba","region":"XX"}');
  expect(() => parseGeoLocation(payload)).toThrow();
});

test('valida a lista de municípios do IBGE', () => {
  expect(parseCities([{ nome: 'Curitiba' }, { nome: 'Londrina' }])).toEqual(['Curitiba', 'Londrina']);
  expect(() => parseCities([{ nome: '' }])).toThrow();
});

test('o servidor usa a cidade da plataforma quando o país é o Brasil', async () => {
  const urls: string[] = [];
  const fakeFetch = async (input: string): Promise<Response> => {
    urls.push(String(input));
    return Response.json({ success: true, country_code: 'BR', city: 'Curitiba', region_code: 'PR' });
  };
  expect(await resolveGeo({ ip: '203.0.113.42', country: 'BR', city: 'Londrina', regionCode: 'BR-PR' }, fakeFetch)).toEqual({ city: 'Londrina', region: 'PR' });
  expect(urls).toEqual([]);
});

test('o servidor consulta o IP com ipwho.is quando a plataforma não informa a cidade', async () => {
  const urls: string[] = [];
  const fakeFetch = async (input: string): Promise<Response> => {
    urls.push(String(input));
    return Response.json({ success: true, country_code: 'BR', city: 'Curitiba', region_code: 'PR' });
  };
  const result = await resolveGeo({ ip: '::ffff:203.0.113.42' }, fakeFetch);
  expect(urls).toEqual(['https://ipwho.is/203.0.113.42']);
  expect(result).toEqual({ city: 'Curitiba', region: 'PR' });
});

test('o servidor falha quando não há cidade da plataforma nem resposta válida do IP', async () => {
  const fakeFetch = async (): Promise<Response> => { throw new Error('indisponível'); };
  await expect(resolveGeo({ ip: '203.0.113.42', country: 'BR' }, fakeFetch)).rejects.toThrow();
});

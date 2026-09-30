import { states } from './checkout';

export type City = { name: string; uf: string };
const stateCodesByName: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapá: 'AP', amazonas: 'AM', bahia: 'BA', ceará: 'CE',
  'distrito federal': 'DF', 'espírito santo': 'ES', goiás: 'GO', maranhão: 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', pará: 'PA',
  paraíba: 'PB', paraná: 'PR', pernambuco: 'PE', piauí: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondônia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'são paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const cleanText = (value: unknown): string | null => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 80 ? value.trim() : null;

export function parseGeoLocation(value: unknown): City {
  if (!isRecord(value)) throw new Error('Resposta de localização inválida.');
  const name = cleanText(value.city);
  const uf = typeof value.region === 'string' ? value.region.toUpperCase() : '';
  if (!name || !states.includes(uf)) throw new Error('A localização não contém uma cidade e uma UF válidas.');
  return { name, uf };
}

export function parseIpLocation(value: unknown): City {
  if (!isRecord(value) || value.success !== true || typeof value.country_code !== 'string' || value.country_code.toUpperCase() !== 'BR') throw new Error('A localização estimada não pertence ao Brasil.');
  const regionCode = typeof value.region_code === 'string' ? value.region_code.toUpperCase().match(/^(?:BR-)?([A-Z]{2})$/)?.[1] : undefined;
  const regionName = typeof value.region === 'string' ? value.region.trim().toLocaleLowerCase('pt-BR') : '';
  return parseGeoLocation({ city: value.city, region: regionCode ?? stateCodesByName[regionName] });
}

export function parseCities(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 8000) throw new Error('Lista de cidades inválida.');
  const cities = value.map((entry: unknown) => isRecord(entry) ? cleanText(entry.nome) : null);
  if (cities.some((city) => !city)) throw new Error('Lista de cidades inválida.');
  return (cities as string[]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function lookupIpLocation(signal: AbortSignal): Promise<City> {
  const response = await fetch('/api/geo', { headers: { accept: 'application/json' }, signal });
  if (!response.ok) throw new Error('Não foi possível detectar sua cidade.');
  const payload: unknown = await response.json();
  return parseGeoLocation(payload);
}

export async function loadCities(uf: string, signal: AbortSignal): Promise<string[]> {
  if (!states.includes(uf)) throw new Error('Estado inválido.');
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`, { signal });
  if (!response.ok) throw new Error('Não foi possível carregar as cidades.');
  const payload: unknown = await response.json();
  return parseCities(payload);
}

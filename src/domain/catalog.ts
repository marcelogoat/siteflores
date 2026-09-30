import source from '../data/catalog.json';

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: string;
  categories: string[];
  price_cents: number;
  old_price_cents: number | null;
  image: string;
  sold_out: boolean;
  description?: string;
  desc?: string;
};

export const products: Product[] = source;
export const categories = ['Rosas', 'Buquês', 'Orquídeas', 'Lírios', 'Lisianthus', 'Tulipas', 'Girassóis', 'Gérberas', 'Arranjos', 'Cestas', 'Kits e Presentes'];
export const occasions = ['Dia das Mães', 'Namorados', 'Aniversário', 'Condolências'];
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function productById(id: number): Product {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error('Produto não encontrado no catálogo.');
  return product;
}

const romanticCategories = ['Rosas', 'Buquês', 'Tulipas'];
const gratitudeCategories = ['Orquídeas', 'Lisianthus', 'Cestas'];
const occasionCategories: Record<string, string[]> = {
  'Dia das Mães': gratitudeCategories,
  Namorados: romanticCategories,
  Romance: romanticCategories,
  Gratidão: gratitudeCategories,
  Aniversário: ['Girassóis', 'Gérberas', 'Arranjos', 'Kits e Presentes'],
  Condolências: ['Lírios', 'Arranjos'],
};

export type CatalogFilter = { query?: string; category?: string; occasion?: string; sort?: string; promotion?: boolean; maxPrice?: number };

export function filterProducts(filter: CatalogFilter): Product[] {
  const query = normalize(filter.query ?? '');
  const matches = products.filter((item) => {
    if (query && !normalize(`${item.name} ${item.category}`).includes(query)) return false;
    if (filter.category && !item.categories.includes(filter.category)) return false;
    if (filter.occasion && !(occasionCategories[filter.occasion]?.some((category) => item.categories.includes(category)))) return false;
    if (filter.promotion && !(item.old_price_cents && item.old_price_cents > item.price_cents)) return false;
    if (filter.maxPrice && item.price_cents > filter.maxPrice) return false;
    return true;
  });
  return matches.sort((a, b) => {
    if (filter.sort === 'price-asc') return a.price_cents - b.price_cents;
    if (filter.sort === 'price-desc') return b.price_cents - a.price_cents;
    if (filter.sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
    return Number(a.sold_out) - Number(b.sold_out);
  });
}

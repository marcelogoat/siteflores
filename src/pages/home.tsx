import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categories, filterProducts, products } from '@/domain/catalog';
import { Icon, PageFrame, type IconName } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import css from '@/styles/pages/home.css?inline';

const tiles: { category: string; label: string; icon: IconName }[] = [{ category: 'Rosas', label: 'Rosas', icon: 'rose' }, { category: 'Buquês', label: 'Buquês', icon: 'bouquet' }, { category: 'Orquídeas', label: 'Orquídeas', icon: 'orchid' }, { category: 'Kits e Presentes', label: 'Presentes', icon: 'gift' }, { category: '__promo', label: 'Promoções', icon: 'receipt' }];
const occasionChips = [['Romance', '💘 Romance'], ['Aniversário', '🎂 Aniversário'], ['Gratidão', '🤍 Gratidão'], ['Condolências', '🌿 Condolências']];

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(24);
  const category = params.get('cat') ?? '';
  const occasion = params.get('ocasiao') ?? '';
  const query = params.get('q') ?? '';
  const sort = params.get('sort') ?? '';
  const promotion = params.get('promo') === '1';
  const result = useMemo(() => filterProducts({ category, occasion, query, sort, promotion }), [category, occasion, query, sort, promotion]);
  const filtered = Boolean(category || occasion || query || promotion);
  const featured = products.filter((product) => !product.sold_out).slice(0, 8);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (['cat', 'ocasiao', 'promo'].includes(key)) { next.delete('cat'); next.delete('ocasiao'); next.delete('promo'); }
    if (value) next.set(key, value); else next.delete(key);
    setVisible(24);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  const groups = !filtered && !sort ? categories.map((name) => ({ name, items: result.slice(0, visible).filter((product) => product.category === name) })).filter((group) => group.items.length) : [{ name: '', items: result.slice(0, visible) }];
  return <PageFrame name="home" css={css}>
    <section className="container hero-express" aria-labelledby="hero-title"><div className="express"><div className="express__body"><span className="express__pill"><Icon name="bolt" />Frete grátis na entrega padrão</span><h1 id="hero-title" className="express__title">Flores frescas para presentear</h1><p className="express__text">Surpreenda quem você ama com flores frescas montadas por uma floricultura parceira da cidade de destino. Você pede online, paga via PIX e acompanha o pedido; o prazo aparece pelo CEP no checkout.</p><a className="express__cta" href="#catalogo">Pedir agora</a></div><div className="express__media"><img src="/cdn/catalog/proprias/315-hero.webp" alt="Buquê de rosas colombianas com eucalipto" width={360} height={300} fetchPriority="high" /></div></div></section>
    <section className="container" aria-label="Categorias em destaque"><div className="catmenu">{tiles.map((tile) => <button key={tile.category} type="button" className={`catmenu__item${tile.category === '__promo' ? ' catmenu__item--dark' : ''}`} onClick={() => { update(tile.category === '__promo' ? 'promo' : 'cat', tile.category === '__promo' ? '1' : tile.category); document.getElementById('catalogo')?.scrollIntoView(); }}><span className="catmenu__icon"><Icon name={tile.icon} /></span>{tile.label}</button>)}</div></section>
    <section className="container" aria-label="Garantia de frescor"><div className="fresh"><Icon name="check" /><div><strong>Garantia de frescor</strong><span>Flores montadas no dia, direto da floricultura parceira.</span></div></div></section>
    <section className="container occasions" aria-label="Compre por ocasião"><h2>Para qual ocasião?</h2><div className="chips">{occasionChips.map(([value, label]) => <button key={value} className={`chip${occasion === value ? ' is-active' : ''}`} aria-pressed={occasion === value} onClick={() => update('ocasiao', occasion === value ? '' : value)}>{label}</button>)}</div></section>
    {!filtered && <section className="container rail-sec" aria-labelledby="rail-title"><div className="rail__head"><h2 id="rail-title" className="rail__title">Mais pedidos</h2><a className="rail__link" href="#catalogo">Ver todos</a></div><div className="rail__track">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>}
    <section className="toolbar container" id="catalogo" aria-label="Buscar e filtrar produtos"><div className="toolbar__row"><label className="searchbox" htmlFor="busca"><span className="sr-only">Buscar produtos</span><Icon name="search" /><input id="busca" type="search" placeholder="Buscar rosas, orquídeas, cestas…" value={query} onChange={(event) => update('q', event.target.value)} autoComplete="off" /></label><label className="sr-only" htmlFor="ordenar">Ordenar por</label><select id="ordenar" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="">Em destaque</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome: A–Z</option></select></div><div className="chips" aria-label="Categorias">{['', ...categories].map((value) => <button key={value} className={`chip${category === value && !occasion && !promotion ? ' is-active' : ''}`} aria-pressed={category === value && !occasion && !promotion} onClick={() => update('cat', category === value ? '' : value)}>{value || 'Todas'}</button>)}</div></section>
    <main className="container" aria-label="Catálogo de produtos"><div className="catalog-head"><h2 className="title-serif">{query ? `Resultados para “${query}”` : category || occasion || (promotion ? 'Promoções' : 'Entregamos hoje')}</h2><p className="muted" aria-live="polite">{result.length} produtos</p></div>{!result.length ? <div className="empty-state stack"><Icon name="search" /><h3>Nenhuma flor encontrada</h3><p className="muted">Tente outro termo ou escolha uma categoria.</p><button className="btn btn--soft" onClick={() => { setParams({}); setVisible(24); }}>Limpar filtros</button></div> : groups.map((group) => <section key={group.name} className="catalog-group">{group.name && <h3 className="category-heading">{group.name}</h3>}<div className="pgrid">{group.items.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 4} />)}</div></section>)}{result.length > visible && <div className="load-more"><button className="btn btn--ghost" onClick={() => setVisible((count) => count + 24)}>Mostrar mais flores ({result.length - visible})</button></div>}</main>
  </PageFrame>;
}

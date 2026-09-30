import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { categories, filterProducts, normalize, products } from '@/domain/catalog';
import { EmptyState, Icon, PageFrame } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import css from '@/styles/pages/colecao.css?inline';

const categorySlug = (category: string) => normalize(category).replace(/\s+/g, '-');
export function CollectionPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const requested = slug || params.get('slug') || params.get('cat');
  const category = requested ? categories.find((name) => categorySlug(name) === categorySlug(requested)) : undefined;
  const [sort, setSort] = useState('');
  const [visible, setVisible] = useState(24);
  const items = category ? filterProducts({ category, sort }) : [];
  if (requested && !category) return <EmptyState title="Coleção não encontrada" text="Explore as categorias disponíveis na nossa vitrine." to="/colecao" label="Ver coleções" />;
  return <PageFrame name="colecao" css={css}><header className="colhead"><div className="container"><nav className="colhead__crumbs" aria-label="Você está aqui"><Link to="/">Início</Link><Icon name="chevron" /><Link to="/colecao">Coleções</Link>{category && <><Icon name="chevron" /><span aria-current="page">{category}</span></>}</nav><div className="colhead__row"><h1 className="title-serif">{category || 'Nossas coleções'}</h1>{category && <span className="colhead__count">{items.length} produtos</span>}</div><p className="colhead__sub">{category ? 'Flores frescas para transformar pequenos gestos em momentos especiais.' : 'Encontre o presente perfeito para cada momento.'}</p></div></header><main className="container">{category ? <><div className="coltools"><div className="coltools__row"><div className="chips">{categories.map((name) => <Link key={name} className={`chip${name === category ? ' is-active' : ''}`} to={`/colecao/${categorySlug(name)}`}>{name}</Link>)}</div><select aria-label="Ordenar coleção" value={sort} onChange={(event) => setSort(event.target.value)}><option value="">Em destaque</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome</option></select></div></div><div className="pgrid colgrid">{items.slice(0, visible).map((item) => <ProductCard key={item.id} product={item} />)}</div>{items.length > visible && <div className="load-more"><button className="btn" onClick={() => setVisible((count) => count + 24)}>Mostrar mais flores</button></div>}</> : <div className="colindex">{categories.map((name) => { const selection = products.filter((product) => product.categories.includes(name)); return <Link key={name} className="colcard" to={`/colecao/${categorySlug(name)}`}><div className="colcard__media"><img src={selection[0].image} alt={name} width={400} height={300} loading="lazy" /></div><div className="colcard__body"><span className="colcard__name">{name}</span><span className="colcard__count">{selection.length}</span><Icon name="chevron" /></div></Link>; })}</div>}</main></PageFrame>;
}

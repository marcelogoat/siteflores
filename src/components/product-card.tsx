import { Link } from 'react-router-dom';
import { money, type Product } from '@/domain/catalog';
import { addItem } from '@/domain/commerce';
import { useStore } from '@/store';

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const { transact, showAdded } = useStore();
  const discount = product.old_price_cents && product.old_price_cents > product.price_cents ? Math.round((1 - product.price_cents / product.old_price_cents) * 100) : 0;
  const url = `/produto/${product.slug}`;
  return <article className={`pitem${product.sold_out ? ' pitem--soldout' : ''}`}><Link className="pitem__media" to={url} tabIndex={-1} aria-hidden="true"><img src={product.image} alt={product.name} width={400} height={500} loading={eager ? 'eager' : 'lazy'} decoding="async" />{product.sold_out ? <span className="pitem__tag">Esgotado</span> : discount > 0 && <span className="pitem__tag">−{discount}%</span>}</Link><div className="pitem__body"><Link className="pitem__name" to={url}>{product.name}</Link><div className="pitem__prices">{discount > 0 && <span className="price price--old">{money(product.old_price_cents!)}</span>}<span className="price">{money(product.price_cents)}</span></div><div className="pitem__bottom"><span className="pitem__delivery">Entrega grátis</span><button className="pitem__add" disabled={product.sold_out} aria-label={`Adicionar ${product.name} à sacola`} onClick={() => {
    if (transact((state) => ({ ...state, cart: addItem(state.cart, product.id) }))) showAdded(product.id);
  }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button></div></div></article>;
}

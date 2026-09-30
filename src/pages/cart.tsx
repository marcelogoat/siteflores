import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { money, productById, products, type Product } from '@/domain/catalog';
import { addItem, changeQuantity, itemKey } from '@/domain/commerce';
import { useStore } from '@/store';
import { EmptyState, Icon, PageFrame, Totals } from '@/components/ui';
import css from '@/styles/pages/carrinho.css?inline';

export function CartPage() {
  const { data, transact } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [extrasOpen, setExtrasOpen] = useState(() => new URLSearchParams(location.search).get('extras') === '1');
  const [extrasTab, setExtrasTab] = useState<'chocolate' | 'ursinhos' | 'pelucia'>('chocolate');
  const [selectedExtras, setSelectedExtras] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!extrasOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [extrasOpen]);
  const extraGroups: Record<typeof extrasTab, Product[]> = {
    chocolate: [117, 124, 244, 116, 78, 249, 21, 289].map(productById).filter((product) => !product.sold_out),
    ursinhos: products.filter((product) => /ursinho|urso\b/i.test(product.name) && !product.sold_out),
    pelucia: products.filter((product) => /pelúcia/i.test(product.name) && !/ursinho|urso\b/i.test(product.name) && !product.sold_out),
  };
  const extrasTotal = Object.entries(selectedExtras).reduce((total, [id, quantity]) => total + productById(Number(id)).price_cents * quantity, 0);
  function changeExtra(productId: number, delta: number) {
    setSelectedExtras((current) => {
      const quantity = Math.max(0, Math.min(99, (current[productId] ?? 0) + delta));
      if (!quantity) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: quantity };
    });
  }
  function continueToCheckout() {
    if (extrasTotal) transact((state) => {
      let cart = state.cart;
      for (const [id, quantity] of Object.entries(selectedExtras)) cart = addItem(cart, Number(id), quantity);
      return { ...state, cart };
    });
    navigate('/checkout');
  }
  return <PageFrame name="carrinho" css={css}><main className="container"><header className="page-head"><h1 className="title-serif">Sua sacola</h1><p className="muted">Um carinho que está quase a caminho.</p></header>{!data.cart.length ? <EmptyState title="Sua sacola está vazia" text="Que tal escolher flores para alguém especial?" /> : <><div className="freebar"><Icon name="moto" /><span>Você ganhou frete grátis na Entrega Hoje!</span></div><div className="cart-layout"><section aria-label="Itens da sacola">{data.cart.map((item) => {
    const product = productById(item.productId);
    const key = itemKey(item);
    return <article className="cartitem" key={key}><Link className="cartitem__media" to={`/produto/${product.slug}`}><img src={product.image} alt={product.name} width={96} height={96} /></Link><div className="cartitem__body"><div className="cartitem__top"><Link className="cartitem__name" to={`/produto/${product.slug}`}>{product.name}</Link><button className="cartitem__remove" aria-label={`Remover ${product.name}`} onClick={() => transact((state) => { const cart = state.cart.filter((line) => itemKey(line) !== key); return { ...state, cart, cardMessage: cart.length ? state.cardMessage : '' }; })}><Icon name="close" /></button></div><p className="cartitem__unit">{money(product.price_cents)} / unidade</p>{item.message && <p className="small muted">Cartão: “{item.message}”</p>}<div className="cartitem__row"><div className="qty" aria-label={`Quantidade de ${product.name}`}><button aria-label={`Diminuir quantidade de ${product.name}`} disabled={item.quantity === 1} onClick={() => transact((state) => ({ ...state, cart: changeQuantity(state.cart, key, item.quantity - 1) }))}>−</button><span className="qty__n">{item.quantity}</span><button aria-label={`Aumentar quantidade de ${product.name}`} disabled={item.quantity === 99} onClick={() => transact((state) => ({ ...state, cart: changeQuantity(state.cart, key, item.quantity + 1) }))}>+</button></div><strong className="cartitem__total">{money(product.price_cents * item.quantity)}</strong></div></div></article>;
  })}<section className="cart-card-message" aria-labelledby="cart-card-message-label"><div className="cart-card-message__head"><label id="cart-card-message-label" htmlFor="cart-card-message">Mensagem do cartão</label><span>opcional · grátis</span></div><textarea id="cart-card-message" name="cardMessage" maxLength={200} rows={4} aria-describedby="cart-card-message-count" placeholder="Escreva um recado para acompanhar as flores — ex.: Feliz aniversário! Com carinho, Ana." value={data.cardMessage} onChange={(event) => transact((state) => ({ ...state, cardMessage: event.target.value }))} /><span id="cart-card-message-count" className="cart-card-message__count">{data.cardMessage.length}/200</span></section><Link className="cart-continue" to="/">← Continuar escolhendo flores</Link></section><aside className="card card--elevated cart-summary"><h2>Resumo do pedido</h2><Totals items={data.cart} coupon={data.coupon} /><button className="btn btn--action btn--block btn--pill" type="button" onClick={() => setExtrasOpen(true)}>Finalizar pedido <Icon name="chevron" /></button><p className="cart-summary__note">PIX ou cartão · compra demonstrativa</p></aside></div></>}</main>
    {extrasOpen && <div className="extras-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setExtrasOpen(false); }}>
      <section className="extras-sheet" role="dialog" aria-modal="true" aria-labelledby="extras-title">
        <div className="extras-handle" aria-hidden="true" />
        <header className="extras-head"><div><h2 id="extras-title">Adicione um presente especial</h2><p>Extras selecionados: <strong>{money(extrasTotal)}</strong></p></div><button type="button" aria-label="Fechar" onClick={() => setExtrasOpen(false)}>×</button></header>
        <div className="extras-tabs" role="tablist" aria-label="Tipos de presentes">{([
          ['chocolate', '▦', 'Chocolate'],
          ['ursinhos', '🎁', 'Ursinhos'],
          ['pelucia', '♡', 'Pelúcia'],
        ] as const).map(([key, icon, label]) => <button type="button" role="tab" aria-selected={extrasTab === key} className={extrasTab === key ? 'is-active' : ''} onClick={() => setExtrasTab(key)} key={key}><span aria-hidden="true">{icon}</span>{label}</button>)}</div>
        <div className="extras-products">{extraGroups[extrasTab].map((product) => {
          const quantity = selectedExtras[product.id] ?? 0;
          return <article className="extra-product" key={product.id}><div className="extra-product__image"><img src={product.image} alt={product.name} /></div><h3>{product.name}</h3><div className="extra-product__bottom"><strong>{money(product.price_cents)}</strong>{quantity ? <div className="extra-qty"><button type="button" aria-label={`Remover uma unidade de ${product.name}`} onClick={() => changeExtra(product.id, -1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Adicionar uma unidade de ${product.name}`} onClick={() => changeExtra(product.id, 1)}>+</button></div> : <button className="extra-add" type="button" aria-label={`Adicionar ${product.name}`} onClick={() => changeExtra(product.id, 1)}>+</button>}</div></article>;
        })}</div>
        <footer className="extras-footer"><button className="extras-skip" type="button" onClick={() => navigate('/checkout')}>Pular</button><button className="extras-continue" type="button" onClick={continueToCheckout}>Continuar{extrasTotal > 0 && <strong>{money(extrasTotal)}</strong>}</button></footer>
      </section>
    </div>}
  </PageFrame>;
}

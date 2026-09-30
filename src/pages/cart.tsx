import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { money, productById } from '@/domain/catalog';
import { changeQuantity, couponRate, itemKey } from '@/domain/commerce';
import { useStore, errorMessage } from '@/store';
import { EmptyState, Icon, PageFrame, Totals } from '@/components/ui';
import css from '@/styles/pages/carrinho.css?inline';

export function CartPage() {
  const { data, transact, notify } = useStore();
  const [coupon, setCoupon] = useState(data.coupon);
  const [error, setError] = useState('');
  function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      couponRate(coupon);
      if (transact((state) => ({ ...state, coupon: coupon.trim().toUpperCase() }))) { setError(''); notify('Cupom atualizado.'); }
    } catch (failure) { setError(errorMessage(failure)); }
  }
  return <PageFrame name="carrinho" css={css}><main className="container"><header className="page-head"><h1 className="title-serif">Sua sacola</h1><p className="muted">Um carinho que está quase a caminho.</p></header>{!data.cart.length ? <EmptyState title="Sua sacola está vazia" text="Que tal escolher flores para alguém especial?" /> : <><div className="freebar"><Icon name="moto" /><span>Você ganhou frete grátis na Entrega Hoje!</span></div><div className="cart-layout"><section aria-label="Itens da sacola">{data.cart.map((item) => {
    const product = productById(item.productId);
    const key = itemKey(item);
    return <article className="cartitem" key={key}><Link className="cartitem__media" to={`/produto/${product.slug}`}><img src={product.image} alt={product.name} width={96} height={96} /></Link><div className="cartitem__body"><div className="cartitem__top"><Link className="cartitem__name" to={`/produto/${product.slug}`}>{product.name}</Link><button className="cartitem__remove" aria-label={`Remover ${product.name}`} onClick={() => transact((state) => { const cart = state.cart.filter((line) => itemKey(line) !== key); return { ...state, cart, cardMessage: cart.length ? state.cardMessage : '' }; })}><Icon name="close" /></button></div><p className="cartitem__unit">{money(product.price_cents)} / unidade</p>{item.message && <p className="small muted">Cartão: “{item.message}”</p>}<div className="cartitem__row"><div className="qty" aria-label={`Quantidade de ${product.name}`}><button aria-label={`Diminuir quantidade de ${product.name}`} disabled={item.quantity === 1} onClick={() => transact((state) => ({ ...state, cart: changeQuantity(state.cart, key, item.quantity - 1) }))}>−</button><span className="qty__n">{item.quantity}</span><button aria-label={`Aumentar quantidade de ${product.name}`} disabled={item.quantity === 99} onClick={() => transact((state) => ({ ...state, cart: changeQuantity(state.cart, key, item.quantity + 1) }))}>+</button></div><strong className="cartitem__total">{money(product.price_cents * item.quantity)}</strong></div></div></article>;
  })}<section className="cart-card-message" aria-labelledby="cart-card-message-label"><div className="cart-card-message__head"><label id="cart-card-message-label" htmlFor="cart-card-message">Mensagem do cartão</label><span>opcional · grátis</span></div><textarea id="cart-card-message" name="cardMessage" maxLength={200} rows={4} aria-describedby="cart-card-message-count" placeholder="Escreva um recado para acompanhar as flores — ex.: Feliz aniversário! Com carinho, Ana." value={data.cardMessage} onChange={(event) => transact((state) => ({ ...state, cardMessage: event.target.value }))} /><span id="cart-card-message-count" className="cart-card-message__count">{data.cardMessage.length}/200</span></section><Link className="cart-continue" to="/">← Continuar escolhendo flores</Link></section><aside className="card card--elevated cart-summary"><h2>Resumo do pedido</h2><Totals items={data.cart} coupon={data.coupon} /><form className="coupon-form" onSubmit={applyCoupon}><label className="field" htmlFor="cupom">Cupom de desconto</label><div className="inline-form"><input id="cupom" value={coupon} onChange={(event) => setCoupon(event.target.value)} maxLength={40} placeholder="FLORES10" /><button className="btn btn--soft">Aplicar</button></div><p className="small muted">Experimente FLORES10 nesta demonstração.</p>{error && <p role="alert" className="field__error">{error}</p>}{data.coupon && <button className="text-link" type="button" onClick={() => { if (transact((state) => ({ ...state, coupon: '' }))) setCoupon(''); }}>Remover cupom</button>}</form><Link className="btn btn--action btn--block btn--pill" to="/checkout">Finalizar pedido <Icon name="chevron" /></Link><p className="cart-summary__note">PIX ou cartão · compra demonstrativa</p></aside></div></>}</main></PageFrame>;
}

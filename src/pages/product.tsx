import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { products, money } from '@/domain/catalog';
import { addItem } from '@/domain/commerce';
import { useStore } from '@/store';
import { EmptyState, Icon, PageFrame } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import css from '@/styles/pages/produto.css?inline';

export function ProductPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const id = params.get('id');
  const product = slug ? products.find((item) => item.slug === slug) : id && /^\d+$/.test(id) ? products.find((item) => item.id === Number(id)) : undefined;
  const [message, setMessage] = useState('');
  const [added, setAdded] = useState(false);
  const { transact, showAdded } = useStore();
  if (!product) return <EmptyState title="Produto não encontrado" text="Este produto não faz parte do catálogo. Conheça nossas outras flores." />;
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 8);
  const extras = products.filter((item) => ['Kits e Presentes', 'Cestas'].includes(item.category) && !item.sold_out && item.id !== product.id).slice(0, 4);
  function buy() {
    if (!product) return;
    if (transact((state) => ({ ...state, cart: addItem(state.cart, product.id, 1, message) }))) { setAdded(true); showAdded(product.id); }
  }
  return <PageFrame name="produto" css={css}><main className="container product-page">
    <nav className="crumbs" aria-label="Você está aqui"><Link to="/">Início</Link><span className="crumbs__sep">›</span><Link to={`/?cat=${encodeURIComponent(product.category)}`}>{product.category}</Link><span className="crumbs__sep">›</span><span className="crumbs__here" aria-current="page">{product.name}</span></nav>
    <section className="pdp"><figure className="pdp__media"><img src={product.image} alt={product.name} width={800} height={1000} fetchPriority="high" />{product.sold_out && <span className="pitem__tag">Esgotado</span>}</figure>
      <div className="pdp__info"><div className="pdp__head"><p className="pdp__category">{product.category}</p><h1 className="pdp__name title-serif">{product.name}</h1></div><div><div className="pdp__prices"><span className="price--lg">{money(product.price_cents)}</span></div><p className="pdp__pix">Pagamento via <strong>PIX</strong></p></div>
        {product.sold_out ? <div className="pdp__soldout"><strong>Temporariamente esgotado.</strong> Confira outras opções abaixo.</div> : <><div className="express-note"><span className="express-note__icon"><Icon name="moto" /></span><div><strong>Entrega Hoje grátis</strong><p>Flores frescas, preparadas na cidade de destino.</p></div></div><div><h2 className="pdp__label">Tamanho</h2><div className="sizes"><span className="size is-active">Único · {money(product.price_cents)}</span></div></div><div><div className="cardmsg__head"><label className="pdp__label" htmlFor="card-message">Mensagem do cartão</label><span className="cardmsg__opt">Opcional · grátis</span></div><textarea id="card-message" className="cardmsg__box" maxLength={200} rows={3} placeholder="Escreva um carinho para quem vai receber…" value={message} onChange={(event) => { setMessage(event.target.value); setAdded(false); }} /><p className="cardmsg__count">{message.length}/200</p></div>{added && <p className="pdp__feedback" role="status"><Icon name="check" />Adicionado! <Link to="/carrinho">Ver minha sacola</Link></p>}<div className="buybar"><div className="buybar__total"><small>Total</small><strong>{money(product.price_cents)}</strong></div><button className="btn btn--action buybar__btn" onClick={buy}><Icon name="bag" />Adicionar à sacola</button></div></>}
        <ul className="pdp__trust"><li><Icon name="check" /><span><strong>Flores montadas no dia</strong><br />Preparadas com carinho por floricultura parceira.</span></li><li><Icon name="gift" /><span><strong>Um presente especial</strong><br />Cartão com sua mensagem incluído.</span></li><li><Icon name="moto" /><span><strong>Frete grátis</strong><br />Na modalidade Entrega Hoje.</span></li></ul><section className="pdp__desc"><h2>Sobre este presente</h2><p>{product.description || product.desc}</p><p>As imagens são ilustrativas. Esta loja é uma demonstração sem entregas reais.</p></section>
      </div></section>
    {!product.sold_out && <section className="related"><div className="related__head"><h2 className="title-serif">Complete seu presente</h2></div><div className="pgrid">{extras.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    <section className="related"><div className="related__head"><h2 className="title-serif">Você também pode gostar</h2></div><div className="pgrid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>
  </main></PageFrame>;
}

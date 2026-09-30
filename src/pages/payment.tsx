import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { DemoNotice, EmptyState, Icon, PageFrame } from '@/components/ui';
import { orderLabel } from '@/components/order-summary';
import { money } from '@/domain/catalog';
import { quote } from '@/domain/commerce';
import { confirmPayment } from '@/domain/storage';
import { errorMessage, useStore } from '@/store';
import pixCss from '@/styles/pages/pagamento.css?raw';
import cardCss from '@/styles/pages/cartao.css?raw';

export function PaymentPage({ card = false }: { card?: boolean }) {
  const [params] = useSearchParams();
  const { data, transact, notify } = useStore();
  const navigate = useNavigate();
  const [declined, setDeclined] = useState(false);
  const order = data.orders.find((item) => item.id === params.get('id'));
  if (!order) return <main className="container"><EmptyState title="Não encontramos este pedido" text="Somente pedidos criados nesta demonstração podem ser consultados. Pedidos da loja original não são acessados." to="/acompanhar" label="Ver meus pedidos" icon="receipt" /></main>;
  if (order.status === 'paid') return <Navigate replace to={`/obrigado?id=${order.id}`} />;
  if (order.status === 'cancelled') return <main className="container"><EmptyState title="Pedido cancelado" text="Este pedido demonstrativo foi cancelado. Nenhum valor foi cobrado." /></main>;
  const total = quote(order.items, order.mode, order.coupon).total;
  const reference = `DEMONSTRACAO-SEM-VALOR-${order.id}`;
  function pay() {
    if (!order) return;
    if (transact((state) => {
      const current = state.orders.find((item) => item.id === order.id);
      if (!current) throw new Error('Este pedido não está mais disponível.');
      const paid = confirmPayment(current);
      return { ...state, orders: state.orders.map((item) => item.id === paid.id ? paid : item) };
    })) navigate(`/obrigado?id=${order.id}`);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(reference); notify('Referência demonstrativa copiada. Não é um código PIX.'); }
    catch (error) { notify(`Não foi possível copiar: ${errorMessage(error)}`); }
  }
  return <PageFrame name={card ? 'cartao' : 'pagamento'} css={card ? cardCss : pixCss}><main className="container pay"><header className="pay__head"><span className="pay__kicker">Pagamento com {card ? 'cartão' : 'PIX'}</span><h1 className="pay__title">Falta pouco para suas flores</h1><p className="pay__sub">Pedido <strong>{orderLabel(order)}</strong></p><p className="pay__status" role="status"><span className="pay__dot" />Aguardando simulação</p></header><div className="payment-demo"><DemoNotice /></div>
    {card ? <section className="pay__card stack"><p className="pay__total">Total do pedido: <strong>{money(total)}</strong></p><div className="demo-credit-card" aria-label="Cartão de demonstração, sem valor"><span>BUQUÊ DE ROSAS · DEMO</span><Icon name="rose" /><strong>•••• &nbsp; •••• &nbsp; •••• &nbsp; 4242</strong><span>CLIENTE DEMONSTRAÇÃO</span></div><p className="muted small">Cartão fictício pré-configurado. Não pedimos número de cartão, validade ou código de segurança.</p>{declined && <p className="form-error" role="alert">Recusa simulada. Nenhuma cobrança aconteceu. Você pode tentar aprovar novamente.</p>}<button className="btn btn--primary btn--block" onClick={pay}>Simular aprovação · {money(total)}</button><button className="btn btn--soft btn--block" onClick={() => setDeclined(true)}>Simular cartão recusado</button></section> : <section className="pay__qr-card"><span className="pay__corner pay__corner--tl" /><span className="pay__corner pay__corner--tr" /><span className="pay__corner pay__corner--bl" /><span className="pay__corner pay__corner--br" /><div className="pay__qr-frame demo-pix"><Icon name="rose" /><strong>PIX DEMONSTRATIVO</strong><span>Sem código bancário<br />Sem cobrança real</span></div><div className="pay__timer"><strong className="pay__timer-num">{money(total)}</strong></div><p className="pay__total">Total do pedido · somente demonstração</p><div className="pay__copy"><label className="pay__copy-label" htmlFor="demo-reference">Referência da simulação · não é PIX</label><div className="pay__copy-row"><input className="pay__code" id="demo-reference" value={reference} readOnly /><button className="pay__copy-btn" onClick={copy} aria-label="Copiar referência demonstrativa"><Icon name="doc" /></button></div><p className="pay__copy-hint">Não cole esta referência no aplicativo do banco.</p></div><div className="pay__steps"><h2>Como testar o pagamento</h2><ol><li>Confira o pedido e o total acima.</li><li>Use o botão abaixo para confirmar a simulação.</li><li>Acompanhe a preparação e a entrega demonstrativas.</li></ol></div><button className="btn btn--primary btn--block payment-confirm" onClick={pay}><Icon name="check" />Simular pagamento aprovado</button></section>}
    <div className="pay__actions payment-switch"><Link className="btn btn--soft btn--block" to={`/${card ? 'pagamento' : 'cartao'}?id=${order.id}`}>Prefiro pagar com {card ? 'PIX' : 'cartão'}</Link><Link className="text-link" to={`/acompanhar?id=${order.id}`}>Ver detalhes do pedido</Link></div><p className="pay__note">Nenhum provedor de pagamento está conectado. Precisa de ajuda? <Link to="/atendimento">Fale com a gente</Link>.</p></main></PageFrame>;
}

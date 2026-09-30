import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { DemoNotice, EmptyState, Icon, PageFrame } from '@/components/ui';
import { orderLabel } from '@/components/order-summary';
import { money } from '@/domain/catalog';
import { quote } from '@/domain/commerce';
import { getPixStatus } from '@/domain/pix';
import { confirmPayment } from '@/domain/storage';
import { errorMessage, useStore } from '@/store';
import pixCss from '@/styles/pages/pagamento.css?raw';
import cardCss from '@/styles/pages/cartao.css?raw';

export function PaymentPage({ card = false }: { card?: boolean }) {
  const [params] = useSearchParams();
  const { data, transact, notify } = useStore();
  const navigate = useNavigate();
  const [declined, setDeclined] = useState(false);
  const [statusError, setStatusError] = useState('');
  const order = data.orders.find((item) => item.id === params.get('id'));

  useEffect(() => {
    const pendingOrder = order;
    if (card || !pendingOrder?.pix || pendingOrder.status !== 'pending') return;
    const orderId = pendingOrder.id;
    const transactionId = pendingOrder.pix.transactionId;
    const expectedAmount = quote(pendingOrder.items, pendingOrder.mode, pendingOrder.coupon, pendingOrder.orderBump?.priceCents ?? 0).total;
    let active = true;
    const controller = new AbortController();
    async function check() {
      try {
        const result = await getPixStatus(transactionId, controller.signal);
        if (!active) return;
        setStatusError('');
        if (result.status === 'PAID') {
          if (result.amount !== expectedAmount) {
            setStatusError('O valor confirmado pelo gateway não corresponde ao pedido. Fale com o atendimento.');
            return;
          }
          transact((state) => {
            const current = state.orders.find((item) => item.id === orderId);
            if (!current || current.status !== 'pending') return state;
            const paid = confirmPayment(current);
            return { ...state, orders: state.orders.map((item) => item.id === paid.id ? paid : item) };
          });
          navigate(`/obrigado?id=${orderId}`, { replace: true });
        } else if (result.status === 'CANCELLED' || result.status === 'REFUNDED') {
          transact((state) => ({ ...state, orders: state.orders.map((item) => item.id === orderId ? { ...item, status: 'cancelled' as const, stage: 0 } : item) }));
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) setStatusError('Não foi possível atualizar o status agora. Tentaremos novamente.');
      }
    }
    void check();
    const interval = window.setInterval(() => void check(), 5_000);
    return () => { active = false; controller.abort(); window.clearInterval(interval); };
  }, [card, navigate, order, transact]);

  if (!order) return <main className="container"><EmptyState title="Não encontramos este pedido" text="Não foi possível localizar este pedido neste navegador." to="/acompanhar" label="Ver meus pedidos" icon="receipt" /></main>;
  if (order.status === 'paid') return <Navigate replace to={`/obrigado?id=${order.id}`} />;
  if (order.status === 'cancelled') return <main className="container"><EmptyState title="Pedido cancelado" text="O PIX expirou ou foi cancelado." /></main>;
  const total = quote(order.items, order.mode, order.coupon, order.orderBump?.priceCents ?? 0).total;
  if (!card && !order.pix) return <main className="container"><EmptyState title="PIX indisponível para este pedido" text="Este pedido foi criado antes da integração de pagamentos. Gere um novo pedido." to="/" label="Escolher flores" /></main>;

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
    try {
      if (!order?.pix) return;
      await navigator.clipboard.writeText(order.pix.paymentData.copyPaste);
      notify('Código PIX copiado.');
    } catch (error) {
      notify(`Não foi possível copiar: ${errorMessage(error)}`);
    }
  }

  return <PageFrame name={card ? 'cartao' : 'pagamento'} css={card ? cardCss : pixCss}>
    <main className="container pay">
      <header className="pay__head"><span className="pay__kicker">Pagamento com {card ? 'cartão' : 'PIX'}</span><h1 className="pay__title">Falta pouco para suas flores</h1><p className="pay__sub">Pedido <strong>{orderLabel(order)}</strong></p><p className="pay__status" role="status"><span className="pay__dot" />Aguardando {card ? 'simulação' : 'pagamento'}</p></header>
      {card && <div className="payment-demo"><DemoNotice /></div>}
      {card
        ? <section className="pay__card stack"><p className="pay__total">Total do pedido: <strong>{money(total)}</strong></p><div className="demo-credit-card" aria-label="Cartão de demonstração, sem valor"><span>BUQUÊ DE ROSAS · DEMO</span><Icon name="rose" /><strong>•••• &nbsp; •••• &nbsp; •••• &nbsp; 4242</strong><span>CLIENTE DEMONSTRAÇÃO</span></div><p className="muted small">Cartão fictício pré-configurado. Não pedimos número de cartão, validade ou código de segurança.</p>{declined && <p className="form-error" role="alert">Recusa simulada. Nenhuma cobrança aconteceu. Você pode tentar aprovar novamente.</p>}<button className="btn btn--primary btn--block" onClick={pay}>Simular aprovação · {money(total)}</button><button className="btn btn--soft btn--block" onClick={() => setDeclined(true)}>Simular cartão recusado</button></section>
        : order.pix && <section className="pay__qr-card"><span className="pay__corner pay__corner--tl" /><span className="pay__corner pay__corner--tr" /><span className="pay__corner pay__corner--bl" /><span className="pay__corner pay__corner--br" /><div className="pay__qr-frame"><img src={order.pix.paymentData.qrCodeBase64} alt="QR Code PIX do pedido" /></div><div className="pay__timer"><strong className="pay__timer-num">{money(total)}</strong></div><p className="pay__total">Escaneie o QR Code ou use o PIX Copia e Cola</p><div className="pay__copy"><label className="pay__copy-label" htmlFor="pix-code">PIX Copia e Cola</label><div className="pay__copy-row"><input className="pay__code" id="pix-code" value={order.pix.paymentData.copyPaste} readOnly /><button className="pay__copy-btn" onClick={copy} aria-label="Copiar código PIX"><Icon name="doc" /></button></div><p className="pay__copy-hint">Válido até {new Date(order.pix.paymentData.expiresAt).toLocaleString('pt-BR')}.</p></div>{statusError && <p className="form-error pay__status-error" role="status">{statusError}</p>}</section>}
      <div className="pay__actions payment-switch">{card && order.pix && <Link className="btn btn--soft btn--block" to={`/pagamento?id=${order.id}`}>Prefiro pagar com PIX</Link>}<Link className="text-link" to={`/acompanhar?id=${order.id}`}>Ver detalhes do pedido</Link></div>
      <p className="pay__note">{card ? 'O pagamento por cartão continua em modo demonstrativo.' : 'A confirmação acontece automaticamente após o pagamento.'} Precisa de ajuda? <Link to="/atendimento">Fale com a gente</Link>.</p>
    </main>
  </PageFrame>;
}

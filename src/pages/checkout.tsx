import { useRef, useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DemoNotice, EmptyState, Icon, PageFrame, Totals } from '@/components/ui';
import { money, productById } from '@/domain/catalog';
import { deliveryModes, itemKey } from '@/domain/commerce';
import { demoCheckout, emptyCheckout, states, today, validateCheckout, type CheckoutData } from '@/domain/checkout';
import { createOrder, isDeliveryMode } from '@/domain/storage';
import { useStore } from '@/store';
import css from '@/styles/pages/checkout.css?raw';

export function CheckoutPage() {
  const { data, transact } = useStore();
  const navigate = useNavigate();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<CheckoutData>({ ...emptyCheckout, mensagem: data.cardMessage, cidade: data.city?.name ?? '', estado: data.city?.uf ?? '', nome: data.profile?.name ?? '', email: data.profile?.email ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutData, string>>>({});
  function change(key: keyof CheckoutData, value: string) {
    if (key === 'mode' && !isDeliveryMode(value)) return;
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    if (key === 'mensagem') transact((state) => ({ ...state, cardMessage: value }));
  }
  function field(key: keyof CheckoutData, label: string, type: HTMLInputTypeAttribute = 'text', optional = false) {
    return <div className="field"><label htmlFor={key}>{label}{optional && <span className="muted"> (opcional)</span>}</label><input id={key} name={key} type={type} value={values[key]} onChange={(event) => change(key, event.target.value)} required={!optional} maxLength={200} min={type === 'date' ? today() : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errors[key] && <p className="field__error" id={`${key}-error`}>{errors[key]}</p>}</div>;
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCheckout(values);
    setErrors(validation);
    const first = Object.keys(validation)[0];
    if (first) { form.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${first}"]`)?.focus(); return; }
    let id = '';
    if (transact((state) => {
      const order = createOrder(values, state.cart, state.coupon);
      id = order.id;
      return { ...state, orders: [order, ...state.orders], cart: [], coupon: '', cardMessage: '' };
    })) navigate(`/pagamento?id=${encodeURIComponent(id)}`);
  }
  if (!data.cart.length) return <main className="container"><EmptyState title="Sua sacola está vazia" text="Escolha suas flores antes de finalizar o pedido." /></main>;
  return <PageFrame name="checkout" css={css}><main className="container checkout"><div className="stack"><header><Link className="checkout__back" to="/carrinho">← Voltar para a sacola</Link><h1 className="checkout__title">Finalizar pedido</h1><p className="checkout__sub">Entrega por floricultura parceira da cidade de destino. Pagamento via PIX.</p><div className="progress" aria-label="Etapa 2 de 3: dados e entrega"><span className="is-done" /><span className="is-done" /><span /></div></header><DemoNotice /><button className="btn btn--secondary" onClick={() => { setValues(demoCheckout); setErrors({}); transact((state) => ({ ...state, cardMessage: demoCheckout.mensagem })); }}>Preencher com dados fictícios</button><form id="checkout-form" ref={form} className="stack" onSubmit={submit} noValidate>
    <section className="panel step"><div className="step__head"><span className="step__num">1</span><h2>Seus dados</h2></div><div className="fields">{field('nome', 'Nome completo')}<div className="row2 row2--tel">{field('telefone', 'Telefone / WhatsApp', 'tel')}{field('cpf', 'CPF')}</div>{field('email', 'E-mail', 'email')}<p className="field__hint">Nesta demonstração, nenhum e-mail será enviado. O CPF não é salvo.</p></div></section>
    <section className="panel step"><div className="step__head"><span className="step__num">2</span><h2>Quem vai receber</h2></div><div className="fields">{field('recebedor', 'Nome de quem recebe')}<label className="field" htmlFor="mensagem">Mensagem do cartão <span className="muted">(opcional)</span><textarea id="mensagem" name="mensagem" value={values.mensagem} onChange={(event) => change('mensagem', event.target.value)} maxLength={200} rows={3} /><span className="field__hint">Vai impressa no cartão que acompanha as flores. {values.mensagem.length}/200</span></label></div></section>
    <section className="panel step"><div className="step__head"><span className="step__num">3</span><h2>Endereço de entrega</h2></div><div className="fields"><div className="row-cep">{field('cep', 'CEP')}<div className="cepstatus">Preencha manualmente o endereço de demonstração.</div></div>{field('endereco', 'Endereço (rua, avenida…)')}<div className="row2 row2--num">{field('numero', 'Número')}{field('complemento', 'Complemento', 'text', true)}</div>{field('bairro', 'Bairro')}<div className="row2">{field('cidade', 'Cidade')}<div className="field"><label htmlFor="estado">Estado</label><select id="estado" name="estado" value={values.estado} onChange={(event) => change('estado', event.target.value)} required aria-invalid={Boolean(errors.estado)} aria-describedby={errors.estado ? 'estado-error' : undefined}><option value="">UF</option>{states.map((uf) => <option key={uf}>{uf}</option>)}</select>{errors.estado && <p className="field__error" id="estado-error">{errors.estado}</p>}</div></div></div></section>
    <section className="panel step"><div className="step__head"><span className="step__num">4</span><h2>Entrega</h2></div><div className="shipopts">{Object.entries(deliveryModes).map(([mode, option]) => <label className="shipopt" key={mode}><input type="radio" name="mode" value={mode} checked={values.mode === mode} onChange={(event) => change('mode', event.target.value)} /><span className="shipopt__dot" /><span className="shipopt__body"><span className="shipopt__name"><span className="shipopt__icon"><Icon name={mode === 'vip' ? 'bolt' : 'moto'} /></span>{option.label}<span className={option.cents ? 'shipopt__price' : 'shipopt__free'}>{option.cents ? money(option.cents) : 'Grátis'}</span></span><span className="shipopt__desc">{option.description}</span></span></label>)}</div>{values.mode === 'agendada' && <div className="row2 schedule">{field('data', 'Data', 'date')}<div className="field"><label htmlFor="periodo">Horário</label><select id="periodo" name="periodo" value={values.periodo} onChange={(event) => change('periodo', event.target.value)} aria-invalid={Boolean(errors.periodo)} aria-describedby={errors.periodo ? 'periodo-error' : undefined}><option value="">Escolha…</option>{['08h às 12h', '12h às 18h', '18h às 22h'].map((period) => <option key={period}>{period}</option>)}</select>{errors.periodo && <p className="field__error" id="periodo-error">{errors.periodo}</p>}</div></div>}</section>
    {Object.keys(errors).some((key) => errors[key as keyof CheckoutData]) && <p className="form-error" role="alert">Confira os campos destacados antes de continuar.</p>}
  </form></div><aside className="checkout__aside panel stack"><h2>Resumo do pedido</h2><div className="summary__items">{data.cart.map((item) => { const product = productById(item.productId); return <div className="sitem" key={itemKey(item)}><img className="sitem__img" src={product.image} alt="" /><div><p className="sitem__name">{product.name}</p><p className="sitem__qty">Quantidade: {item.quantity}</p></div><strong className="sitem__price">{money(product.price_cents * item.quantity)}</strong></div>; })}</div><hr className="hairline" /><Totals items={data.cart} mode={values.mode} coupon={data.coupon} /><p className="paynote"><Icon name="rose" /><span>Flores preparadas com carinho. Nesta versão, a entrega e o pagamento são apenas uma simulação.</span></p><div className="aside-pay"><button className="btn btn--primary btn--block btn--pay" form="checkout-form"><Icon name="check" />Pagar com PIX</button><Link className="text-link small" to="/termos">Ao continuar, você aceita os Termos de Uso.</Link></div></aside></main><div className="paybar"><button className="btn btn--primary btn--block btn--pay" form="checkout-form"><Icon name="check" />Pagar com PIX</button><p className="pay-hint">Etapa 3: simulação de pagamento, sem cobrança.</p></div></PageFrame>;
}

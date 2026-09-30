import { useEffect, useRef, useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, Icon, PageFrame, Totals } from '@/components/ui';
import { money, productById } from '@/domain/catalog';
import { deliveryModes, itemKey } from '@/domain/commerce';
import { emptyCheckout, formatCep, formatCpf, formatPhone, lookupCep, states, today, validateCheckout, type CheckoutData } from '@/domain/checkout';
import { createOrder, isDeliveryMode } from '@/domain/storage';
import { createPix } from '@/domain/pix';
import { useStore } from '@/store';
import css from '@/styles/pages/checkout.css?raw';

const emailDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'icloud.com', 'live.com', 'bol.com.br'];

export function CheckoutPage() {
  const { data, transact } = useStore();
  const navigate = useNavigate();
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<CheckoutData>({ ...emptyCheckout, mensagem: data.cardMessage, cidade: data.city?.name ?? '', estado: data.city?.uf ?? '', nome: data.profile?.name ?? '', email: data.profile?.email ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutData, string>>>({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cepMessage, setCepMessage] = useState('Digite o CEP para preencher o endereço.');
  const [emailFocused, setEmailFocused] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const identificationKeys: (keyof CheckoutData)[] = ['nome', 'telefone', 'cpf', 'email', 'recebedor', 'mensagem'];
  const addressKeys: (keyof CheckoutData)[] = ['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'mode', 'data', 'periodo'];
  function change(key: keyof CheckoutData, value: string) {
    if (key === 'mode' && !isDeliveryMode(value)) return;
    const formatted = key === 'telefone' ? formatPhone(value) : key === 'cpf' ? formatCpf(value) : key === 'cep' ? formatCep(value) : value;
    setValues((current) => ({ ...current, [key]: formatted }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    if (key === 'mensagem') transact((state) => ({ ...state, cardMessage: formatted }));
  }
  function field(key: keyof CheckoutData, label: string, type: HTMLInputTypeAttribute = 'text', optional = false) {
    const maxLength = key === 'telefone' ? 15 : key === 'cpf' ? 14 : key === 'cep' ? 9 : 200;
    return <div className="field"><label htmlFor={key}>{label}{optional && <span className="muted"> (opcional)</span>}</label><input id={key} name={key} type={type} value={values[key]} onChange={(event) => change(key, event.target.value)} required={!optional} maxLength={maxLength} min={type === 'date' ? today() : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errors[key] && <p className="field__error" id={`${key}-error`}>{errors[key]}</p>}</div>;
  }
  useEffect(() => {
    const cep = values.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      setCepStatus('idle');
      setCepMessage('Digite o CEP para preencher o endereço.');
      return;
    }
    const controller = new AbortController();
    setCepStatus('loading');
    setCepMessage('Buscando endereço…');
    void lookupCep(cep, controller.signal).then((address) => {
      setValues((current) => current.cep.replace(/\D/g, '') === cep ? { ...current, ...address } : current);
      setErrors((current) => ({ ...current, cep: undefined, endereco: undefined, bairro: undefined, cidade: undefined, estado: undefined }));
      setCepStatus('success');
      setCepMessage('Endereço encontrado.');
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setCepStatus('error');
      setCepMessage(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Não foi possível consultar o CEP. Preencha manualmente.');
    });
    return () => controller.abort();
  }, [values.cep]);
  const [emailUser = '', emailDomain = ''] = values.email.split('@');
  const emailSuggestions = values.email.includes('@') && emailUser ? emailDomains.filter((domain) => domain.startsWith(emailDomain.toLowerCase())).map((domain) => `${emailUser}@${domain}`) : [];
  const todayValue = today();
  const maxDeliveryDate = new Date();
  maxDeliveryDate.setHours(12, 0, 0, 0);
  maxDeliveryDate.setDate(maxDeliveryDate.getDate() + 365);
  const maxDeliveryValue = `${maxDeliveryDate.getFullYear()}-${String(maxDeliveryDate.getMonth() + 1).padStart(2, '0')}-${String(maxDeliveryDate.getDate()).padStart(2, '0')}`;
  const firstWeekday = (calendarMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarDays: (number | null)[] = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedDateLabel = values.data ? new Date(`${values.data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Escolher uma data';
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const lastMonth = new Date(maxDeliveryDate.getFullYear(), maxDeliveryDate.getMonth(), 1);
  const canGoPreviousMonth = calendarMonth.getTime() > currentMonth.getTime();
  const canGoNextMonth = calendarMonth.getTime() < lastMonth.getTime();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paymentLoading) return;
    setPaymentError('');
    const validation = validateCheckout(values);
    if (step < 3) {
      const keys = step === 1 ? identificationKeys : addressKeys;
      const stepErrors = Object.fromEntries(Object.entries(validation).filter(([key]) => keys.includes(key as keyof CheckoutData))) as Partial<Record<keyof CheckoutData, string>>;
      setErrors(stepErrors);
      const first = Object.keys(stepErrors)[0];
      if (first) { form.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${first}"]`)?.focus(); return; }
      setErrors({});
      setStep(step === 1 ? 2 : 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors(validation);
    const first = Object.keys(validation)[0];
    if (first) { form.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${first}"]`)?.focus(); return; }
    const id = `demo_${crypto.randomUUID()}`;
    const cart = data.cart.map((item) => ({ ...item }));
    const coupon = data.coupon;
    setPaymentLoading(true);
    try {
      const pix = await createPix(id, cart, coupon, values);
      const order = createOrder(values, cart, coupon, null, id, pix);
      if (transact((state) => ({ ...state, orders: [order, ...state.orders], cart: [], coupon: '', cardMessage: '' }))) navigate(`/pagamento?id=${encodeURIComponent(id)}`);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Não foi possível gerar o PIX. Tente novamente.');
    } finally {
      setPaymentLoading(false);
    }
  }
  function goBack() {
    setErrors({});
    setStep((current) => current === 3 ? 2 : 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (!data.cart.length) return <main className="container"><EmptyState title="Sua sacola está vazia" text="Escolha suas flores antes de finalizar o pedido." /></main>;
  const actionLabel = step === 3 ? 'Confirmar e pagar com PIX' : 'Continuar';
  return <PageFrame name="checkout" css={css}>
    <main className="container checkout">
      <div className="stack">
        <header>
          {step === 1 ? <Link className="checkout__back" to="/carrinho">← Voltar para a sacola</Link> : <button className="checkout__back" type="button" onClick={goBack}>← Voltar</button>}
          <p className="checkout__eyebrow">Etapa {step} de 3</p>
          <h1 className="checkout__title">{step === 1 ? 'Identificação' : step === 2 ? 'Endereço' : 'Confirmação'}</h1>
          <p className="checkout__sub">{step === 1 ? 'Informe quem compra e quem receberá o presente.' : step === 2 ? 'Escolha o endereço e a modalidade de entrega.' : 'Revise os dados antes de seguir para o pagamento.'}</p>
          <div className="checkout-steps" aria-label={`Etapa ${step} de 3`}>
            {['Identificação', 'Endereço', 'Confirmação'].map((label, index) => <div className={index + 1 <= step ? 'is-done' : ''} key={label}><span>{index + 1}</span><small>{label}</small></div>)}
          </div>
        </header>
        <form id="checkout-form" ref={form} className="stack" onSubmit={submit} noValidate>
          {step === 1 && <>
            <section className="panel step"><div className="step__head"><span className="step__num">1</span><h2>Seus dados</h2></div><div className="fields">{field('nome', 'Nome e sobrenome')}<div className="row2 row2--tel">{field('telefone', 'Telefone / WhatsApp', 'tel')}{field('cpf', 'CPF')}</div><div className="field email-field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" value={values.email} onChange={(event) => { change('email', event.target.value); setEmailFocused(true); }} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} autoComplete="off" required maxLength={200} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} aria-expanded={emailFocused && emailSuggestions.length > 0} aria-controls="email-suggestions" />{emailFocused && emailSuggestions.length > 0 && <div className="email-suggestions" id="email-suggestions" role="listbox" aria-label="Sugestões de e-mail">{emailSuggestions.map((suggestion) => { const domain = suggestion.slice(emailUser.length + 1); return <button type="button" role="option" key={suggestion} onMouseDown={(event) => event.preventDefault()} onClick={() => { change('email', suggestion); setEmailFocused(false); }}><span>{emailUser}@</span><strong>{domain}</strong></button>; })}</div>}{errors.email && <p className="field__error" id="email-error">{errors.email}</p>}</div></div></section>
            <section className="panel step"><div className="step__head"><Icon name="gift" /><h2>Quem vai receber</h2></div><div className="fields">{field('recebedor', 'Nome de quem recebe')}<label className="field" htmlFor="mensagem">Mensagem do cartão <span className="muted">(opcional)</span><textarea id="mensagem" name="mensagem" value={values.mensagem} onChange={(event) => change('mensagem', event.target.value)} maxLength={200} rows={3} /><span className="field__hint">Vai impressa no cartão. {values.mensagem.length}/200</span></label></div></section>
          </>}
          {step === 2 && <>
            <section className="panel step"><div className="step__head"><span className="step__num">2</span><h2>Endereço de entrega</h2></div><div className="fields"><div className="row-cep">{field('cep', 'CEP')}<div className="cepstatus" data-state={cepStatus}>{cepStatus === 'success' && <Icon name="check" />}{cepMessage}</div></div>{field('endereco', 'Endereço (rua, avenida…)')}<div className="row2 row2--num">{field('numero', 'Número')}{field('complemento', 'Complemento', 'text', true)}</div>{field('bairro', 'Bairro')}<div className="row2">{field('cidade', 'Cidade')}<div className="field"><label htmlFor="estado">Estado</label><select id="estado" name="estado" value={values.estado} onChange={(event) => change('estado', event.target.value)} required aria-invalid={Boolean(errors.estado)} aria-describedby={errors.estado ? 'estado-error' : undefined}><option value="">UF</option>{states.map((uf) => <option key={uf}>{uf}</option>)}</select>{errors.estado && <p className="field__error" id="estado-error">{errors.estado}</p>}</div></div></div></section>
            <section className="panel step"><div className="step__head"><Icon name="moto" /><h2>Modalidade de entrega</h2></div><div className="shipopts">{Object.entries(deliveryModes).map(([mode, option]) => <label className="shipopt" key={mode}><input type="radio" name="mode" value={mode} checked={values.mode === mode} onChange={(event) => change('mode', event.target.value)} /><span className="shipopt__dot" /><span className="shipopt__body"><span className="shipopt__name"><span className="shipopt__icon"><Icon name={mode === 'vip' ? 'bolt' : 'moto'} /></span>{option.label}<span className={option.cents ? 'shipopt__price' : 'shipopt__free'}>{option.cents ? money(option.cents) : 'Grátis'}</span></span><span className="shipopt__desc">{option.description}</span></span></label>)}</div>{values.mode === 'agendada' && <div className="schedule"><div className="field date-picker"><label htmlFor="date-trigger">Data</label><button id="date-trigger" className="date-trigger" type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}><span>{selectedDateLabel}</span><span aria-hidden="true">▾</span></button>{errors.data && <p className="field__error" id="data-error">{errors.data}</p>}</div><div className="field"><label htmlFor="periodo">Horário</label><select id="periodo" name="periodo" value={values.periodo} onChange={(event) => change('periodo', event.target.value)} aria-invalid={Boolean(errors.periodo)} aria-describedby={errors.periodo ? 'periodo-error' : undefined}><option value="">Escolha o horário…</option>{['08h às 12h', '12h às 18h', '18h às 22h'].map((period) => <option key={period}>{period}</option>)}</select>{errors.periodo && <p className="field__error" id="periodo-error">{errors.periodo}</p>}</div>{calendarOpen && <div className="calendar" role="group" aria-label="Escolha a data da entrega"><div className="calendar__head"><button type="button" aria-label="Mês anterior" disabled={!canGoPreviousMonth} onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Próximo mês" disabled={!canGoNextMonth} onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div><div className="calendar__week" aria-hidden="true">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar__days">{calendarDays.map((day, index) => { if (day === null) return <span key={`empty-${index}`} />; const value = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const disabled = value < todayValue || value > maxDeliveryValue; return <button type="button" key={value} disabled={disabled} className={`${value === todayValue ? 'is-today' : ''}${value === values.data ? ' is-selected' : ''}`} aria-label={new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'full' })} aria-pressed={value === values.data} onClick={() => { change('data', value); setCalendarOpen(false); }}>{day}</button>; })}</div></div>}</div>}</section>
          </>}
          {step === 3 && <section className="panel step confirmation-review">
            <div className="step__head"><span className="step__num">3</span><h2>Revise seu pedido</h2></div>
            <div className="review-block"><div><h3>Identificação</h3><button type="button" onClick={() => setStep(1)}>Editar</button></div><p><strong>{values.nome}</strong><br />{values.email} · {values.telefone}</p><p>Presente para <strong>{values.recebedor}</strong></p></div>
            <div className="review-block"><div><h3>Entrega</h3><button type="button" onClick={() => setStep(2)}>Editar</button></div><p>{values.endereco}, {values.numero}{values.complemento ? ` · ${values.complemento}` : ''}<br />{values.bairro} · {values.cidade}/{values.estado} · CEP {values.cep}</p><p><strong>{deliveryModes[values.mode].label}</strong> · {deliveryModes[values.mode].cents ? money(deliveryModes[values.mode].cents) : 'Grátis'}</p></div>
          </section>}
          {Object.keys(errors).some((key) => errors[key as keyof CheckoutData]) && <p className="form-error" role="alert">Confira os campos destacados antes de continuar.</p>}
          {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
        </form>
      </div>
      <aside className="checkout__aside panel stack"><h2>Resumo do pedido</h2><div className="summary__items">{data.cart.map((item) => { const product = productById(item.productId); return <div className="sitem" key={itemKey(item)}><img className="sitem__img" src={product.image} alt="" /><div><p className="sitem__name">{product.name}</p><p className="sitem__qty">Quantidade: {item.quantity}</p></div><strong className="sitem__price">{money(product.price_cents * item.quantity)}</strong></div>; })}</div><hr className="hairline" /><Totals items={data.cart} mode={values.mode} coupon={data.coupon} /><div className="aside-pay"><button className="btn btn--primary btn--block btn--pay" form="checkout-form" disabled={paymentLoading}>{step === 3 && !paymentLoading && <Icon name="check" />}{paymentLoading ? 'Gerando PIX…' : actionLabel}</button></div></aside>
    </main>
    <div className="paybar"><button className="btn btn--primary btn--block btn--pay" form="checkout-form" disabled={paymentLoading}>{step === 3 && !paymentLoading && <Icon name="check" />}{paymentLoading ? 'Gerando PIX…' : actionLabel}</button><p className="pay-hint">Etapa {step} de 3 · {step === 3 ? 'revise e confirme seu pedido' : 'seus dados ficam salvos ao avançar'}</p></div>
  </PageFrame>;
}

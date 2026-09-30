import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { DemoNotice, Icon, Modal } from '@/components/ui';
import { OrderList } from '@/components/order-summary';
import { emptyStore } from '@/domain/storage';
import { useStore } from '@/store';

export function AccountPage() {
  const { data, transact, notify } = useStore();
  const [name, setName] = useState(data.profile?.name ?? '');
  const [email, setEmail] = useState(data.profile?.email ?? '');
  const [resetOpen, setResetOpen] = useState(false);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { notify('Informe seu nome.'); return; }
    if (transact((state) => ({ ...state, profile: { name: name.trim(), email: email.trim() } }))) notify('Perfil demonstrativo salvo neste navegador.');
  }
  return <main className="container account-page stack"><header><p className="eyebrow">Seu cantinho de carinho</p><h1 className="title-serif">Minha conta</h1><p className="muted">{data.profile ? `Olá, ${data.profile.name}!` : 'Seus dados e pedidos em um só lugar.'}</p></header><DemoNotice>Perfil local, sem login ou senha. Use dados fictícios. Os pedidos ficam disponíveis a quem usar este navegador.</DemoNotice><form className="panel stack" onSubmit={save}><h2><Icon name="user" /> Meus dados</h2><label className="field" htmlFor="profile-name">Nome<input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label><label className="field" htmlFor="profile-email">E-mail<input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={200} required /></label><button className="btn btn--primary">Salvar perfil local</button><button className="text-link" type="button" onClick={() => { setName('Cliente Demonstração'); setEmail('cliente@example.com'); }}>Usar dados fictícios</button></form><section className="stack"><h2>Meus pedidos</h2>{data.orders.length ? <OrderList orders={data.orders} /> : <div className="panel stack"><p className="muted">Você ainda não fez um pedido. Que tal surpreender alguém?</p><Link className="btn btn--soft" to="/">Escolher flores</Link></div>}</section><section className="panel stack"><h2>Privacidade da demonstração</h2><p className="muted">Limpe os dados para apagar sacola, pedidos, chamados, perfil e localização deste navegador. Esta ação não afeta nenhuma loja real.</p><button className="btn btn--soft" onClick={() => setResetOpen(true)}>Limpar todos os dados locais</button></section><Modal title="Limpar demonstração?" open={resetOpen} onClose={() => setResetOpen(false)}><div className="stack"><p>Todos os pedidos, chamados e preferências locais serão apagados. Esta ação não pode ser desfeita.</p><button className="btn btn--primary" onClick={() => { if (transact(emptyStore)) { setName(''); setEmail(''); setResetOpen(false); notify('Dados da demonstração apagados.'); } }}>Sim, apagar dados locais</button><button className="btn btn--soft" onClick={() => setResetOpen(false)}>Cancelar</button></div></Modal></main>;
}

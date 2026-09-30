import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { categories, occasions, products } from '@/domain/catalog';
import { loadCities, lookupIpLocation, type City } from '@/domain/geolocation';
import { useStore } from '@/store';
import { Brand, Icon, Modal, type IconName } from './ui';

const categoryIcons: IconName[] = ['rose', 'bouquet', 'orchid', 'lily', 'lily', 'bouquet', 'sun', 'sun', 'vase', 'basket', 'gift'];
export const institutionalLinks = [
  ['sobre', 'Sobre'], ['como-funciona', 'Como funciona'], ['faq', 'Perguntas frequentes'], ['politica-privacidade', 'Política de Privacidade'], ['termos', 'Termos de Uso'], ['troca-devolucao', 'Troca e Devolução'], ['politica-entrega', 'Política de Entrega'], ['politica-cookies', 'Cookies'], ['contato', 'Contato'], ['atendimento', 'Atendimento'],
];
const notices = ['Frete grátis na entrega padrão', 'Flores frescas, preparadas com carinho', 'Floriculturas parceiras na cidade de destino', 'Escolha suas flores e surpreenda quem você ama'];
const stateNames: Record<string, string> = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };

export function Shell() {
  const { data, transact } = useStore();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [cityConfirmationOpen, setCityConfirmationOpen] = useState(false);
  const [pendingCity, setPendingCity] = useState<City | null>(null);
  const [locationMode, setLocationMode] = useState<'confirm' | 'choose'>('confirm');
  const [manualSelection, setManualSelection] = useState(false);
  const [selectedUf, setSelectedUf] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [cityError, setCityError] = useState('');
  const [notice, setNotice] = useState(0);
  const [cookie, setCookie] = useState(false);
  const count = data.cart.reduce((total, item) => total + item.quantity, 0);
  const bare = /^\/(checkout|pagamento|cartao)(\.html)?$/.test(location.pathname);
  useEffect(() => {
    const timer = setInterval(() => setNotice((value) => (value + 1) % notices.length), 4500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (data.city || manualSelection || /^\/(checkout|pagamento|cartao)(\.html)?$/.test(location.pathname) || institutionalLinks.some(([path]) => location.pathname === `/${path}`)) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    void lookupIpLocation(controller.signal).then((city) => {
      if (!active) return;
      setPendingCity(city);
      setLocationMode('confirm');
      setCityConfirmationOpen(true);
    }).catch(() => {
      if (!active) return;
      setManualSelection(true);
      setLocationMode('choose');
      setCityConfirmationOpen(true);
    }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [data.city, location.pathname, manualSelection]);
  useEffect(() => {
    if (!cityConfirmationOpen || locationMode !== 'choose' || !selectedUf) return;
    let active = true;
    const controller = new AbortController();
    setCitiesLoading(true);
    setCityError('');
    void loadCities(selectedUf, controller.signal).then((items) => {
      if (!active) return;
      setCities(items);
    }).catch(() => {
      if (!active) return;
      setCityError('Não foi possível carregar as cidades. Tente de novo.');
    }).finally(() => { if (active) setCitiesLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [selectedUf, cityConfirmationOpen, locationMode]);
  useEffect(() => {
    setMenu(false);
  }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView();
      if (target instanceof HTMLInputElement) target.focus({ preventScroll: true });
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash]);
  function confirmCity(city: City) {
    if (!transact((state) => ({ ...state, city }))) return;
    setCityConfirmationOpen(false);
    setManualSelection(false);
  }
  function chooseCity() {
    setManualSelection(true);
    setLocationMode('choose');
    setSelectedUf('');
    setSelectedCity('');
    setCities([]);
    setCityError('');
  }
  function confirmManualCity() {
    if (!selectedCity || !cities.includes(selectedCity) || !selectedUf) {
      setCityError('Escolha sua cidade.');
      return;
    }
    confirmCity({ name: selectedCity, uf: selectedUf });
  }
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="topbar">
      {!bare && <div className="notice"><Icon name="moto" /><span>{notice === 0 ? <><em>Frete grátis</em> na entrega padrão</> : notices[notice]}</span></div>}
      <div className="container topbar__row"><div className="topbar__left"><button className="topbar__menu" aria-label="Abrir menu de coleções" aria-expanded={menu} onClick={() => setMenu(true)}><Icon name="menu" /></button><Brand /></div><div className="topbar__right"><Link className="topbar__cart" to="/conta" aria-label="Minha conta"><Icon name="user" /></Link><Link className="topbar__cart" to="/carrinho" aria-label={`Abrir sacola, ${count} itens`}><Icon name="bag" />{count > 0 && <span className="badge">{count}</span>}</Link></div></div>
      {!bare && <button className="local-location" onClick={() => { setManualSelection(true); chooseCity(); setCityConfirmationOpen(true); }}><Icon name="pin" /><span>Entregar em <strong>{data.city ? `${data.city.name} · ${data.city.uf}` : 'Detectar localização'}</strong></span><Icon name="chevron" /></button>}
    </header>
    <div id="conteudo" tabIndex={-1}><Outlet /></div>
    {!/^\/checkout(?:\.html)?$/.test(location.pathname) && <footer className="site-footer"><div className="container"><Brand /><nav className="site-footer__links" aria-label="Institucional">{institutionalLinks.map(([path, label]) => <Link key={path} to={`/${path}`}>{label}</Link>)}</nav><p className="site-footer__legal">Demonstração independente de front-end · sem vínculo operacional com a loja de referência.<br />Imagens e identidade reproduzidas para avaliação visual. Nenhuma venda real.<br /><button className="text-link" onClick={() => setCookie(true)}>Preferências de privacidade</button></p></div></footer>}
    <nav className="footer-nav" aria-label="Navegação principal"><NavLink to="/" end><Icon name="home" /><span>Início</span></NavLink><Link to="/#busca"><Icon name="search" /><span>Buscar</span></Link><NavLink to="/carrinho"><Icon name="bag" /><span>Sacola{count ? ` (${count})` : ''}</span></NavLink><NavLink to="/acompanhar"><Icon name="receipt" /><span>Pedidos</span></NavLink><NavLink to="/contato"><Icon name="help" /><span>Ajuda</span></NavLink></nav>
    <Modal title="Coleções" open={menu} onClose={() => setMenu(false)} drawer><div className="menu-intro"><span>Um carinho para cada momento</span><h3>Encontre suas flores</h3></div><div className="menu-list">{categories.map((category, index) => <Link className="menu-list__item" key={category} to={`/?cat=${encodeURIComponent(category)}`} onClick={() => setMenu(false)}><span className="menu-list__icon"><Icon name={categoryIcons[index]} /></span><span className="menu-list__label">{category}</span><span className="menu-list__count">{products.filter((product) => product.categories.includes(category)).length}</span><span className="menu-list__chev"><Icon name="chevron" /></span></Link>)}</div><h3 className="menu-section-title">Por ocasião</h3><div className="chips">{occasions.map((occasion) => <Link className="chip" key={occasion} to={`/?ocasiao=${encodeURIComponent(occasion)}`} onClick={() => setMenu(false)}>{occasion}</Link>)}</div><div className="menu-extra"><Link to="/conta" onClick={() => setMenu(false)}>Minha conta</Link><Link to="/acompanhar" onClick={() => setMenu(false)}>Acompanhar pedido</Link><Link to="/atendimento" onClick={() => setMenu(false)}>Falar com atendimento</Link></div></Modal>
    <Modal title="Onde você está?" open={cityConfirmationOpen} onClose={() => {}} dismissible={false} className="modal--location"><div className="location-confirm"><span className="location-confirm__icon"><Icon name="pin" /></span><h3>Onde você está?</h3>{locationMode === 'confirm' && pendingCity ? <><p>Identificamos que você está em <strong>{pendingCity.name} - {stateNames[pendingCity.uf] ?? pendingCity.uf}</strong>. Confirma?</p><div className="location-confirm__actions"><button className="btn btn--primary btn--block" onClick={() => confirmCity(pendingCity)}>Sim, confirmar</button><button className="btn btn--block location-confirm__change" onClick={chooseCity}>Não, escolher outra</button></div></> : <><p>{pendingCity ? 'Selecione seu estado e cidade:' : 'Não conseguimos detectar sua cidade. Selecione abaixo:'}</p><div className="location-confirm__fields"><label htmlFor="geo-uf">Estado</label><select id="geo-uf" value={selectedUf} onChange={(event) => { setSelectedUf(event.target.value); setSelectedCity(''); setCities([]); setCityError(''); }}><option value="">Selecione o estado</option>{Object.entries(stateNames).map(([uf, name]) => <option key={uf} value={uf}>{name}</option>)}</select><label htmlFor="geo-city">Cidade</label><select id="geo-city" value={selectedCity} disabled={!selectedUf || citiesLoading || !cities.length} onChange={(event) => { setSelectedCity(event.target.value); setCityError(''); }}><option value="">{citiesLoading ? 'Carregando…' : 'Selecione a cidade'}</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}</select>{cityError && <span className="location-confirm__error" role="alert">{cityError}</span>}<button className="btn btn--primary btn--block" onClick={confirmManualCity}>Confirmar localização</button></div></>}</div></Modal>
    <Modal title="Sua privacidade" open={cookie} onClose={() => setCookie(false)}><div className="stack"><p>Esta versão usa armazenamento local para sacola, pedidos demonstrativos, cidade confirmada e preferências.</p><p>Não há cookies publicitários nem rastreamento. A cidade é estimada pelo IP usando ipwho.is, sem solicitar permissão de GPS.</p><Link className="text-link" to="/politica-cookies" onClick={() => setCookie(false)}>Ler a política de cookies</Link><button className="btn btn--primary btn--block" onClick={() => setCookie(false)}>Entendi</button></div></Modal>
  </>;
}

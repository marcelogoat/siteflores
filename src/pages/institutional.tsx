import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import content from '@/data/institutional.json';
import { DemoNotice, PageFrame } from '@/components/ui';
import privacyCss from '@/styles/pages/politica-privacidade.css?raw';
import termsCss from '@/styles/pages/termos.css?raw';
import returnsCss from '@/styles/pages/troca-devolucao.css?raw';
import deliveryCss from '@/styles/pages/politica-entrega.css?raw';
import cookiesCss from '@/styles/pages/politica-cookies.css?raw';

export type InstitutionalPageName = Exclude<keyof typeof content, 'contato'>;
const pageStyles: Record<InstitutionalPageName, string> = {
  sobre: '',
  'como-funciona': '',
  faq: '',
  'politica-privacidade': privacyCss,
  termos: termsCss,
  'troca-devolucao': returnsCss,
  'politica-entrega': deliveryCss,
  'politica-cookies': cookiesCss,
};

export function InstitutionalPage({ page }: { page: InstitutionalPageName }) {
  const navigate = useNavigate();
  function followLink(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest('a');
    const href = anchor?.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    navigate(href);
  }
  return <PageFrame name={page} css={pageStyles[page]}><div className="container institutional-notice"><DemoNotice>Texto da loja de referência reproduzido para avaliação visual; não representa uma política desta demonstração. Não há vendas reais. A localização aproximada é estimada pelo IP via ipwho.is, que recebe o IP público, sem solicitar permissão de GPS.</DemoNotice></div><div onClick={followLink} dangerouslySetInnerHTML={{ __html: content[page] }} /></PageFrame>;
}

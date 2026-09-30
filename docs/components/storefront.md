# Front-end da loja

## Organização

| Caminho | Responsabilidade |
| --- | --- |
| `src/app.tsx` | Rotas, aliases, títulos e erro de renderização |
| `src/components/shell.tsx` | Cabeçalho, menu, cidade, rodapé e navegação |
| `src/components/ui.tsx` | Ícones, modal acessível, avisos, totais e estilos por página |
| `src/components/product-card.tsx` | Card reutilizável do catálogo |
| `src/components/order-summary.tsx` | Identificação, itens e lista de pedidos |
| `src/pages/` | Telas da loja e fluxos demonstrativos |
| `src/domain/catalog.ts` | Catálogo, busca, filtros e ordenação |
| `src/domain/commerce.ts` | Sacola, quantidades, cupom e cálculo em centavos |
| `src/domain/checkout.ts` | Validação de formulário e dados fictícios |
| `src/domain/geolocation.ts` | Validação da resposta de `/api/geo` e dos municípios do IBGE |
| `src/server/geo.ts` | Consulta ipwho.is, valida cidade/UF e aplica dados de localização da Cloudflare quando disponíveis |
| `functions/api/geo.ts` | Endpoint `/api/geo` na Cloudflare Pages |
| `vite.config.ts` | Endpoint `/api/geo` no Vite para desenvolvimento local |
| `src/domain/storage.ts` | Pedidos, transições e validação do estado persistido |
| `src/store.tsx` | Contexto React, persistência e notificações |
| `src/data/` | Catálogo, coleções, ícones e conteúdo institucional |
| `src/styles/` | CSS público da referência e estilos da demonstração |
| `public/` | Fontes e imagens locais |
| `scripts/import-reference.py` | Importação dos arquivos públicos obtidos na análise |

## Rotas

| Rota | Tela |
| --- | --- |
| `/` | Vitrine e filtros via query string |
| `/produto/:slug`, `/produto` | Produto |
| `/colecao/:slug`, `/colecao` | Coleção |
| `/carrinho` | Sacola e cupom |
| `/checkout` | Comprador, destinatário, endereço e entrega |
| `/pagamento?id=…`, `/cartao?id=…` | Pagamento demonstrativo |
| `/obrigado?id=…` | Confirmação |
| `/acompanhar?id=…`, `/pedido?id=…` | Pedido local e acompanhamento |
| `/conta` | Perfil, pedidos e limpeza dos dados |
| `/contato`, `/atendimento` | Formulários e chamados locais |
| `/sobre`, `/como-funciona`, `/faq` | Conteúdo institucional |
| `/politica-privacidade`, `/termos`, `/troca-devolucao` | Conteúdo legal reproduzido |
| `/politica-entrega`, `/politica-cookies` | Políticas reproduzidas |

Endereços legados com `.html` redirecionam para a rota correspondente. Endereços desconhecidos e pedidos não locais exibem estados explícitos de não encontrado.

## Persistência e integridade

O estado fica em `localStorage`, chave `rosa.frontend.v1`, com versão de schema 1. Sacola, cupom, mensagem de cartão (até 200 caracteres), pedidos, chamados, cidade confirmada e perfil persistem localmente. A mensagem da sacola é pré-preenchida no checkout e fica vinculada ao pedido demonstrativo. Alterações disparadas em outras abas sincronizam a interface pelo evento `storage`; isto não substitui transações de um backend e não oferece garantia contra escritas simultâneas entre abas.

A leitura valida JSON e regras semânticas: IDs do catálogo, quantidades inteiras de 1 a 99, linhas únicas, entrega, cupom, estados de pedido e unicidade de IDs. Dados inválidos bloqueiam a abertura e não são sobrescritos automaticamente. A limpeza depende de ação explícita do usuário. O navegador consulta `/api/geo` no próprio domínio; o endpoint estima a cidade/UF pelo IP com ipwho.is, sem permissão de GPS, e pode usar os dados da Cloudflare quando disponíveis. Apenas “Sim, confirmar” grava o resultado no armazenamento local. “Não, escolher outra” mostra estados e municípios do IBGE; também é possível escolher manualmente se a detecção falhar. Com cidade salva ou em páginas institucionais, checkout e pagamento, o modal não abre automaticamente. O cabeçalho permite abrir novamente o modal.

Pedidos têm IDs `demo_…`; chamados têm IDs `ticket_…`. Os preços vêm do catálogo local, em centavos. A aprovação de pagamento é idempotente; pedidos não pagos não avançam na entrega. Pedidos cancelados não podem ser aprovados. O CPF não é incluído no pedido persistido.

## Aparência e acessibilidade

A base visual utiliza as fontes Manrope e Libre Caslon Display e os recursos locais da referência. O `PageFrame` isola estilos de tela com CSS `@scope`, exigindo navegador moderno com suporte a esse recurso. O cabeçalho e o rodapé são compartilhados. Modais usam `<dialog>` nativo, com restauração de foco; notificações usam região viva. Há link para pular navegação e rótulos de campos/controles.

Avisos de demonstração, controles de simulação e áreas financeiras foram intencionalmente diferenciados da operação real. O IP público chega a ipwho.is por `/api/geo`; não há solicitação de permissão de GPS. A cidade só é persistida após confirmação ou seleção manual. Nenhuma equivalência visual pixel a pixel foi verificada.

## Verificação

`bun test` cobre domínio, entrada sintaticamente válida mas semanticamente inválida, checkout, pedido, filtros, integridade dos 333 produtos, presença de imagens/fontes, sintaxe TS/TSX e imports locais. A análise de sintaxe do Bun não substitui `bun run typecheck` nem o build Vite. `bun run build` (TypeScript + Vite) também passou localmente.

### Roteiro pendente no portal de navegador

1. Instalar as dependências e iniciar o Vite em terminal visível.
2. Abrir referência e cópia em portal visível, com o mesmo viewport e estado de navegação.
3. Capturar home, produto, sacola, checkout, pagamentos, acompanhamento e páginas institucionais em desktop e celular.
4. Comparar largura, tipografia, espaçamento, ordem dos produtos, imagens e estados; corrigir diferenças observáveis, sem declarar fidelidade com base apenas no código.
5. Percorrer busca/filtros, menu, teclado, diálogos, fluxo de compra fictício, recusa/aprovação, cancelamento, acompanhamento, chamados e limpeza de dados.
6. Conferir navegação direta/reload, console, overflow horizontal e ausência de chamadas a sistemas da loja original.

A validação por navegador permanece bloqueada até que o portal esteja disponível. TypeScript e build passaram localmente; a função de produção deve ser testada em uma implantação Cloudflare Pages autorizada antes de considerá-la validada.

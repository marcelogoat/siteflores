# Buquê de Rosas — demonstração de front-end

Reprodução em React + TypeScript da referência visual `https://www.buquederosas.delivery/`, com catálogo, imagens, ícones e fontes locais. O catálogo contém 333 produtos.

## Executar

Pré-requisito: Bun 1.3.10 ou compatível. Execute em um terminal visível:

```sh
bun install
bun run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

Crie `.env.local` a partir de `.env.example` e configure `BLACKCAT_SECRET_KEY`. A chave é usada somente pelos endpoints do servidor e nunca é incluída no bundle do navegador. Na Cloudflare Pages, cadastre o mesmo nome em **Settings → Variables and Secrets** como secret.

## Verificar

```sh
bun test
bun run typecheck
bun run build
```

Os testes de domínio e integridade usam o runner do Bun. A verificação TypeScript e o build precisam das dependências instaladas. `dist/` é gerado pelo build; o servidor que hospedar a SPA deve servir `index.html` para as rotas do aplicativo. O Vite disponibiliza `/api/geo` durante o desenvolvimento; em produção, use as Pages Functions de `functions/api/geo.ts` na Cloudflare Pages, com diretório de saída `dist/`. Hospedar somente o `dist/` como site estático não disponibiliza esse endpoint.

## Testar o fluxo completo

1. Escolha um produto, personalize o cartão e adicione à sacola.
2. Na sacola, escreva uma mensagem opcional gratuita para o cartão (até 200 caracteres), altere quantidades e experimente o cupom demonstrativo `FLORES10`.
3. No checkout, use o botão de dados fictícios e escolha a entrega.
4. No PIX, confira o QR Code real gerado pela Blackcat; o status é atualizado automaticamente. O cartão continua demonstrativo.
5. Abra a confirmação e o acompanhamento; avance a entrega pela simulação.
6. Consulte os pedidos em Minha conta e crie um chamado local no atendimento.
7. Em Minha conta, limpe os dados locais para reiniciar a demonstração.

Os pedidos persistem somente neste navegador. O acompanhamento não consulta pedidos da loja original. Sem GPS, o navegador consulta `/api/geo` no próprio domínio; a função de servidor consulta o ipwho.is com o IP público e, na Cloudflare Pages, pode usar a cidade/UF informadas pela própria Cloudflare se a consulta falhar. A cidade só é salva localmente após confirmação. É possível escolher outra cidade manualmente pela lista de municípios do IBGE. Com cidade salva, o modal não reabre automaticamente; também não abre nas páginas institucionais, de checkout e de pagamento.

## Escopo

- Home, busca, categorias, ocasiões, promoções, ordenação e coleções.
- Produto, cartão de mensagem, sacola, cupom e checkout.
- PIX/cartão demonstrativos, confirmação e acompanhamento.
- Perfil local, pedidos, contato e chamados locais.
- Sobre, Como funciona, FAQ, privacidade, termos, trocas, entrega e cookies.
- Navegação responsiva, menu, localização automática com confirmação e estados vazios/de erro.

## Limites

Não há autenticação, banco de dados central, consulta de cobertura ou envio de mensagens. Os endpoints `/api/pix/create` e `/api/pix/status/:id` integram o PIX da Blackcat pelo servidor; a chave secreta não é exposta ao navegador. O CPF é enviado ao gateway para gerar o PIX, mas não é salvo no pedido local. Os demais dados do pedido permanecem neste navegador. A confirmação ocorre por consulta periódica; para operação em escala, recomenda-se persistência no servidor e webhook idempotente.

A identidade e os materiais da referência foram reproduzidos para avaliação visual; confirme os direitos de uso antes de publicação. Os textos institucionais reproduzidos não representam políticas operacionais desta demonstração.

A comparação por screenshots/mobile/desktop no navegador ainda está pendente. Não há certificação de equivalência pixel a pixel. O build foi executado localmente, mas a comparação visual por navegador ainda depende de um portal visível; não considere a interface idêntica sem essa comparação.

## Estrutura

Consulte [docs/components/storefront.md](docs/components/storefront.md) para rotas, componentes, armazenamento e roteiro de validação visual.

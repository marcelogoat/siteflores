# Localização por IP (`GET /api/geo`)

A vitrine consulta este endpoint no próprio domínio. Não pede permissão para GPS nem solicita coordenadas. Resposta bem-sucedida: `{ "city": "Curitiba", "region": "PR" }`. Falha de consulta ou localização brasileira inválida: status `502` e `{ "error": "Não foi possível detectar sua cidade." }`. A resposta é `private, no-store` e não deve ser compartilhada em cache entre visitantes.

O servidor consulta `https://ipwho.is/` com o IP público da conexão. Na Cloudflare Pages, `functions/api/geo.ts` usa `CF-Connecting-IP` e, quando a consulta falha, pode usar `request.cf.city`, `request.cf.regionCode` e `request.cf.country` se formarem uma cidade/UF brasileira válida. Em desenvolvimento e preview, `vite.config.ts` oferece o mesmo endpoint sem metadados da Cloudflare. O IP não é salvo pelo aplicativo; ipwho.is recebe o IP público. O modal só salva a cidade no navegador depois que o visitante confirmar ou selecionar outra cidade pelo IBGE.

Para produção na Cloudflare Pages, publique a raiz do projeto com `bun run build` e diretório de saída `dist/`, mantendo `functions/` na raiz. Apenas publicar o `dist/` em hospedagem estática não cria `/api/geo`; nessa situação o usuário irá para a seleção manual de cidade. Teste o endpoint no domínio autorizado antes de usar em produção.

# 2026-10-22 — Paridade da confirmação de ajustes sobrepostos

- [x] Portar o detector e o editor para o pacote compartilhado e consumir no Enterprise.
- [x] Integrar confirmação pré-edição no Community, preservando restrições da edição.
- [x] Validar total/componentes, aliases, hierarquia, cancelar/confirmar e payload final.
- [x] Executar testes, typecheck, builds e smoke de navegador nas duas edições.
- [x] Atualizar conhecimento e lição; registrar cada SHA no vault antes do push.
- [x] Preparar commit/push autorizado, com stage explícito e `[skip ci]`, sem bump/tag/deploy.

Escopo: mesma melhoria já publicada no legado. A decisão é local ao navegador;
os DTOs existentes passam a publicar a família oficial nas duas edições. O guard
Enterprise usa a mesma composição oficial, preservando a interseção de DFUs.
Não há nova operação ou comando REST/MCP, schema, pipeline, tag ou deploy.

## Revisão

36 contratos frontend relacionados e 76 testes backend passaram. Typechecks,
builds Community/Enterprise e fronteiras de edição passaram. Smokes das SPAs
com APIs simuladas provaram confirmação antes do editor, cancelar/confirmar,
restauração de valores e exclusão do ajuste removido do payload; zero erros
de página. O Community manteve agregado somente leitura e seu POST restrito.
Os servidores e browsers próprios de validação foram encerrados.

Os SHAs locais/remotos e o resultado do push ficam no recibo final da entrega;
nenhuma pipeline, imagem, tag ou implantação faz parte desta publicação.

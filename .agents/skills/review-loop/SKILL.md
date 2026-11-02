---
name: review-loop
description: Roda /mattpocock-skills:code-review e /ponytail:ponytail-review em rodadas (máx. 3), valida cada achado no código, aplica as correções, atualiza testes e fecha com relatório por rodada.
disable-model-invocation: true
---

# review-loop

Coordena duas revisões complementares sobre a mesma mudança e corrige o que elas acharem, em **rodadas**:

- `/mattpocock-skills:code-review`: Standards + Spec.
- `/ponytail:ponytail-review`: over-engineering (o que cortar).

Cada rodada = revisar → **triar** → corrigir → testar. Pare na primeira de: 3 rodadas concluídas, ou rodada com zero achados **confirmados**.

## Regras fixas

- Nunca commitar, criar branch, trocar de branch ou fazer push (regra do repo). As correções ficam no working tree.
- Achados de correção (Standards/Spec) vencem cortes do ponytail quando os dois conflitam.
- Responda e reporte em pt-BR.

## 0. Preparar

1. **Ponto fixo**: use o argumento do usuário (commit, branch, tag). Sem argumento, pergunte. Confirme com `git rev-parse <ponto-fixo>`.
2. **Base**: `BASE=$(git merge-base <ponto-fixo> HEAD)`. O alvo de toda rodada é `git diff $BASE` — **working tree incluído**, porque as correções das rodadas anteriores não são commitadas. Diff vazio → avise e pare.
3. Abra o **livro de rodadas** em `<scratchpad>/review-loop.md`: uma seção por rodada, preenchida conforme os passos abaixo.

## 1. Revisar (por rodada)

Invoque as duas skills pela ferramenta Skill, nesta ordem, e guarde os relatórios brutos no livro:

1. `mattpocock-skills:code-review` com args: `ponto fixo <BASE>; revise git diff <BASE> (inclui alterações não commitadas no working tree, não use three-dot contra HEAD)`.
2. `ponytail:ponytail-review` sobre o mesmo `git diff $BASE`.

Da rodada 2 em diante, acrescente aos args de ambas a lista de achados já **rejeitados** (local + motivo), para que não voltem.

Concluído quando: os dois relatórios estão no livro.

## 2. Triar

Numere cada achado das duas revisões (`R<rodada>-<n>`) e leia o código citado antes de classificar. Cada achado recebe exatamente um veredito:

- **confirmado**: o problema existe no código atual → vai para correção.
- **rejeitado**: falso positivo, já tratado, ou contradiz documento do repo (`CONTEXT.md`, `docs/adr/`, skill de arquitetura) → registre a evidência (arquivo:linha ou regra citada).
- **adiado**: real, mas fora do escopo do diff ou exige decisão do usuário → registre o porquê.

Concluído quando: todo achado tem veredito e justificativa no livro. Zero confirmados → pule para o passo 5.

## 3. Corrigir

Para cada confirmado: aplique a menor correção que resolve a causa raiz. Leia a skill `vanguarda-fullstack` antes de mover ou criar código em `app/`.

Atualize testes junto: comportamento alterado → ajuste o teste existente; bug corrigido → um teste que falharia antes da correção; código deletado → remova os testes órfãos.

## 4. Verificar

Rode os scripts de teste e typecheck de cada pacote tocado (ex.: `app/package.json`). Falhou → corrija e rode de novo; não avance de rodada com verificação vermelha. Se uma falha não for resolvível, reverta aquela correção, marque o achado como **adiado** com o erro.

Concluído quando: verificação verde e cada confirmado marcado como corrigido (arquivos tocados + testes alterados) no livro. Volte ao passo 1 se ainda houver rodada disponível.

## 5. Relatório final

Apresente ao usuário, a partir do livro:

**Por rodada** — uma seção `### Rodada N` com tabela:

| ID | Fonte | Achado | Veredito | Ação / justificativa | Arquivos |
|----|-------|--------|----------|----------------------|----------|

Fonte = `standards`, `spec` ou `ponytail`. Abaixo da tabela: comandos de verificação rodados e resultado.

**Resumo final**:

- Rodadas executadas e motivo da parada (sem achados confirmados / limite de 3).
- Totais: achados, confirmados, corrigidos, rejeitados, adiados.
- Testes adicionados/alterados/removidos.
- Pendências: todos os **adiados** e achados confirmados na última rodada que ainda não foram revisados por uma rodada seguinte.
- Lembrete de que nada foi commitado; pergunte se deve commitar.

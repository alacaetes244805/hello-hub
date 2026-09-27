# Ala Caetés: início, lançamentos e orçamento

## O que será criado
- Nova tela inicial **Ala Caetés**, com dois acessos principais: **Orçamento** e **Lançamento**.
- A área **Lançamento** manterá o formulário e a lista atuais, em uma tela própria.
- A área **Orçamento** mostrará as páginas mensais encontradas na planilha; inicialmente, **SETEMBRO 2026**.
- Ao abrir um mês, será exibido um resumo geral e uma lista expansível por organização.
- Cada organização mostrará orçamento do mês, gastos por semana, total utilizado e valor restante, usando os dados reais da planilha.

## Navegação
- `/` — início “Ala Caetés”.
- `/lancamento` — interface atual de lançamentos.
- `/orcamento` — lista de meses disponíveis.
- `/orcamento/setembro-2026` — relatório de setembro, com organizações expansíveis.
- Todas as telas terão caminho claro para voltar.

## Detalhes técnicos
- As páginas mensais serão descobertas pelos nomes das abas da planilha, aceitando o padrão `MÊS ANO` para novos meses futuros.
- O relatório será lido no servidor e organizado em dados seguros para a interface.
- Os totais gerais e os valores de cada organização virão diretamente da aba mensal, sem alterar a planilha.
- Serão preservados o estilo atual, a formatação brasileira de valores e a boa leitura no celular.
- Cada nova página terá título e descrição próprios para compartilhamento.

## Verificação
- Confirmar que os quatro caminhos abrem corretamente.
- Confirmar que **Lançamento** continua funcionando como antes.
- Confirmar que **SETEMBRO 2026** apresenta os números atuais e expande/recolhe cada organização.
- Revisar a apresentação em tela grande e celular, sem erros visíveis.

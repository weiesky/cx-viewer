# UltraPlan — A Máquina de Desejos Definitiva

## O que é UltraPlan

UltraPlan é a **implementação localizada** do cc-viewer para o comando nativo `/ultraplan` do Claude Code. Ele permite que você use todas as capacidades do `/ultraplan` em seu ambiente local **sem precisar iniciar o serviço remoto oficial do Claude**, guiando o Claude Code para realizar tarefas complexas de planejamento e implementação usando **colaboração multiagente**.

Comparado ao modo Plan regular ou Agent Team, o UltraPlan pode:
- Avaliar automaticamente a complexidade da tarefa e selecionar a estratégia de planejamento ideal
- Implantar múltiplos agentes paralelos para explorar a base de código a partir de diferentes dimensões
- Incorporar pesquisa externa (webSearch) para melhores práticas do setor
- Montar automaticamente uma Equipe de Code Review após a execução do plano para revisão de código
- Formar um ciclo fechado completo **Planejar → Executar → Revisar → Corrigir**

---

## Notas importantes

### 1. UltraPlan não é onipotente
O UltraPlan é uma máquina de desejos mais poderosa, mas isso não significa que todo desejo pode ser realizado. Ele é mais poderoso que o Plan e o Agent Team, mas não pode diretamente "fazer você ganhar dinheiro". Considere uma granularidade de tarefas razoável — divida grandes objetivos em tarefas de tamanho médio executáveis em vez de tentar realizar tudo de uma vez.

### 2. Atualmente mais eficaz para projetos de programação
Os modelos e fluxos de trabalho do UltraPlan são profundamente otimizados para projetos de programação. Outros cenários (documentação, análise de dados, etc.) podem ser tentados, mas você pode querer aguardar adaptações em versões futuras.

### 3. Tempo de execução e requisitos de janela de contexto
- Uma execução bem-sucedida do UltraPlan normalmente leva **30 minutos ou mais**
- Requer que o MainAgent tenha uma janela de contexto grande (modelo Opus com contexto 1M recomendado)
- Se você tem apenas um modelo de 200K, **certifique-se de executar `/clear` no contexto antes de rodar**
- O `/compact` do Claude Code tem desempenho ruim quando a janela de contexto é insuficiente — evite ficar sem espaço
- Manter espaço de contexto suficiente é um pré-requisito crítico para a execução bem-sucedida do UltraPlan

Se você tiver dúvidas ou sugestões sobre o UltraPlan localizado, fique à vontade para abrir [Issues no GitHub](https://github.com/anthropics/claude-code/issues) para discutir e colaborar.

---

## Como funciona

O UltraPlan oferece dois modos de operação:

### Modo Automático
Analisa automaticamente a complexidade da tarefa (pontuação 4-12) e direciona para diferentes estratégias:

| Rota | Pontuação | Estratégia |
|------|-----------|------------|
| Rota A | 4-6 | Planejamento leve com exploração direta de código |
| Rota B | 7-9 | Planejamento com diagramas estruturais (Mermaid / ASCII) |
| Rota C | 10-12 | Exploração multiagente + ciclo fechado de revisão |

### Modo Forçado
Ativa diretamente o fluxo de trabalho multiagente completo da Rota C:
1. Implantar até 5 agentes paralelos para explorar a base de código simultaneamente (arquitetura, identificação de arquivos, avaliação de riscos, etc.)
2. Opcionalmente implantar um agente de pesquisa para investigar soluções do setor via webSearch
3. Sintetizar todas as descobertas dos agentes em um plano de implementação detalhado
4. Implantar um agente de revisão para examinar o plano de múltiplas perspectivas
5. Executar o plano após aprovação
6. Montar automaticamente uma Equipe de Code Review para validar a qualidade do código após a implementação

# Champs du corps de la requête (Request Body)

Description des champs de niveau supérieur du corps de la requête `/v1/messages` de l'API Claude.

## Liste des champs

| Champ | Type | Description |
|-------|------|-------------|
| **model** | string | Nom du modèle à utiliser, par exemple `claude-opus-4-6`, `claude-sonnet-4-6` |
| **messages** | array | Historique des messages de la conversation. Chaque message contient `role` (user/assistant) et `content` (un tableau de blocs tels que texte, image, tool_use, tool_result, etc.) |
| **system** | array | System prompt. Contient les instructions principales de Codex, les directives d'utilisation des outils, les informations d'environnement, le contenu de CLAUDE.md, etc. Les blocs avec `cache_control` sont soumis au prompt caching |
| **tools** | array | Liste des définitions d'outils disponibles. Chaque outil contient `name`, `description` et `input_schema` (JSON Schema). MainAgent dispose généralement de plus de 20 outils, tandis que SubAgent n'en a que quelques-uns |
| **metadata** | object | Métadonnées de la requête, contenant généralement `user_id` pour identifier l'utilisateur |
| **max_tokens** | number | Nombre maximum de tokens pour une réponse unique du modèle, par exemple `16000`, `64000` |
| **thinking** | object | Configuration de la réflexion étendue. `type: "enabled"` active le mode de réflexion, `budget_tokens` contrôle la limite de tokens de réflexion |
| **context_management** | object | Configuration de la gestion du contexte. `truncation: "auto"` permet à Codex de tronquer automatiquement les historiques de messages trop longs |
| **output_config** | object | Configuration de sortie, comme les paramètres de `format` |
| **stream** | boolean | Indique si les réponses en streaming sont activées. Codex utilise toujours `true` |

## Structure de messages

Le `content` de chaque message est un tableau de blocs. Les types courants incluent :

- **text** : Contenu en texte brut
- **tool_use** : Invocation d'outil par le modèle (contient `name`, `input`)
- **tool_result** : Résultat de l'exécution de l'outil (contient `tool_use_id`, `content`)
- **image** : Contenu d'image (base64 ou URL)
- **thinking** : Processus de réflexion du modèle (mode de réflexion étendue)

## Structure de system

Le tableau du system prompt contient généralement :

1. **Instructions principales de l'agent** ("You are Codex...")
2. **Directives d'utilisation des outils**
3. **Contenu de CLAUDE.md** (instructions au niveau du projet)
4. **Rappels de compétences** (skills reminder)
5. **Informations d'environnement** (OS, shell, état git, etc.) — En fait, Codex dépend fortement de git. Si un projet dispose d'un dépôt git, Codex démontre une meilleure compréhension du projet, y compris la capacité de récupérer les modifications distantes et l'historique des commits pour assister l'analyse

Les blocs marqués avec `cache_control: { type: "ephemeral" }` sont mis en cache par l'API Anthropic pendant 5 minutes. Lorsque le cache est atteint, la facturation se fait en `cache_read_input_tokens` (nettement moins cher que `input_tokens`).

> **Remarque** : Pour les clients spéciaux comme Codex, le serveur Anthropic ne se base pas entièrement sur l'attribut `cache_control` de la requête pour déterminer le comportement de mise en cache. Le serveur applique automatiquement des stratégies de cache à des champs spécifiques (comme le system prompt et les définitions de tools), même lorsque la requête ne contient pas explicitement de marqueurs `cache_control`. Par conséquent, ne soyez pas surpris si vous ne voyez pas cet attribut dans le corps de la requête — le serveur a déjà effectué la mise en cache en coulisses, il n'expose simplement pas cette information au client. C'est un accord tacite entre Codex et l'API Anthropic.

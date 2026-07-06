# UltraPlan — La Machine a Voeux Ultime

## Qu'est-ce que UltraPlan

UltraPlan est l'**implementation localisee** par cc-viewer de la commande native `/ultraplan` de Claude Code. Il vous permet d'utiliser les capacites completes de `/ultraplan` dans votre environnement local **sans avoir besoin de lancer le service distant officiel de Claude**, en guidant Claude Code pour accomplir des taches complexes de planification et d'implementation en utilisant la **collaboration multi-agents**.

Par rapport au mode Plan classique ou a Agent Team, UltraPlan peut :
- Evaluer automatiquement la complexite de la tache et selectionner la strategie de planification optimale
- Deployer plusieurs agents en parallele pour explorer la base de code sous differentes dimensions
- Integrer la recherche externe (webSearch) pour les meilleures pratiques de l'industrie
- Assembler automatiquement une Code Review Team apres l'execution du plan pour la revue de code
- Former une boucle fermee complete **Plan → Execute → Review → Fix**

---

## Notes Importantes

### 1. UltraPlan N'est Pas Omnipotent
UltraPlan est une machine a voeux plus puissante, mais cela ne signifie pas que chaque voeu peut etre exauce. Il est plus puissant que Plan et Agent Team, mais ne peut pas directement « vous faire gagner de l'argent ». Considerez une granularite de taches raisonnable — decomposez les grands objectifs en taches moyennes executables plutot que d'essayer de tout accomplir en une seule fois.

### 2. Actuellement Plus Efficace pour les Projets de Programmation
Les modeles et flux de travail d'UltraPlan sont profondement optimises pour les projets de programmation. D'autres scenarios (documentation, analyse de donnees, etc.) peuvent etre tentes, mais il est conseille d'attendre les adaptations des versions futures.

### 3. Temps d'Execution et Exigences de Fenetre de Contexte
- Une execution reussie d'UltraPlan prend generalement **30 minutes ou plus**
- Necessite que le MainAgent dispose d'une grande fenetre de contexte (modele Opus avec 1M de contexte recommande)
- Si vous ne disposez que d'un modele 200K, **assurez-vous de faire `/clear` sur le contexte avant l'execution**
- Le `/compact` de Claude Code fonctionne mal lorsque la fenetre de contexte est insuffisante — evitez de manquer d'espace
- Maintenir un espace de contexte suffisant est un prerequis essentiel pour la reussite de l'execution d'UltraPlan

Si vous avez des questions ou des suggestions concernant l'UltraPlan localise, n'hesitez pas a ouvrir des [Issues sur GitHub](https://github.com/anthropics/claude-code/issues) pour discuter et collaborer.

---

## Fonctionnement

UltraPlan propose deux modes de fonctionnement :

### Mode Automatique
Analyse automatiquement la complexite de la tache (score 4-12) et oriente vers differentes strategies :

| Route | Score | Strategie |
|-------|-------|-----------|
| Route A | 4-6 | Planification legere avec exploration directe du code |
| Route B | 7-9 | Planification avec diagrammes structurels (Mermaid / ASCII) |
| Route C | 10-12 | Exploration multi-agents + boucle fermee de revue |

### Mode Force
Active directement le flux de travail multi-agents complet de la Route C :
1. Deployer jusqu'a 5 agents en parallele pour explorer simultanement la base de code (architecture, identification des fichiers, evaluation des risques, etc.)
2. Optionnellement deployer un agent de recherche pour investiguer les solutions de l'industrie via webSearch
3. Synthetiser toutes les decouvertes des agents en un plan d'implementation detaille
4. Deployer un agent de revue pour examiner le plan sous plusieurs perspectives
5. Executer le plan une fois approuve
6. Assembler automatiquement une Code Review Team pour valider la qualite du code apres l'implementation

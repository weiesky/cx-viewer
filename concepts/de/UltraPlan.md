# UltraPlan — Die ultimative Wunschmaschine

## Was ist UltraPlan

UltraPlan ist die **lokalisierte Implementierung** von cc-viewer fuer den nativen `/ultraplan`-Befehl von Claude Code. Es ermoeglicht Ihnen, die vollstaendigen Funktionen von `/ultraplan` in Ihrer lokalen Umgebung zu nutzen, **ohne Claudes offiziellen Remote-Dienst starten zu muessen**, und leitet Claude Code an, komplexe Planungs- und Implementierungsaufgaben mittels **Multi-Agenten-Zusammenarbeit** zu bewaeltigen.

Im Vergleich zum regulaeren Plan-Modus oder Agent Team kann UltraPlan:
- Automatisch die Aufgabenkomplexitaet bewerten und die optimale Planungsstrategie waehlen
- Mehrere parallele Agenten einsetzen, um die Codebasis aus verschiedenen Dimensionen zu erkunden
- Externe Recherche (webSearch) fuer branchenbewaehrte Verfahren einbeziehen
- Nach der Planausfuehrung automatisch ein Code Review Team zusammenstellen
- Einen vollstaendigen **Plan → Execute → Review → Fix** Kreislauf bilden

---

## Wichtige Hinweise

### 1. UltraPlan ist nicht allmaechtig
UltraPlan ist eine leistungsfaehigere Wunschmaschine, aber das bedeutet nicht, dass jeder Wunsch erfuellt werden kann. Es ist leistungsfaehiger als Plan und Agent Team, kann aber nicht direkt „Geld fuer Sie verdienen". Beruecksichtigen Sie eine angemessene Aufgabengranularitaet — zerlegen Sie grosse Ziele in ausfuehrbare mittelgrosse Aufgaben, anstatt alles auf einmal erreichen zu wollen.

### 2. Derzeit am effektivsten fuer Programmierprojekte
Die Vorlagen und Workflows von UltraPlan sind tiefgehend fuer Programmierprojekte optimiert. Andere Szenarien (Dokumentation, Datenanalyse usw.) koennen ausprobiert werden, aber es empfiehlt sich, auf Anpassungen in zukuenftigen Versionen zu warten.

### 3. Ausfuehrungszeit und Kontextfenster-Anforderungen
- Eine erfolgreiche UltraPlan-Ausfuehrung dauert in der Regel **30 Minuten oder laenger**
- Erfordert, dass der MainAgent ein grosses Kontextfenster hat (1M-Context-Opus-Modell empfohlen)
- Wenn Sie nur ein 200K-Modell haben, **fuehren Sie unbedingt `/clear` vor der Ausfuehrung aus**
- Claude Codes `/compact` funktioniert schlecht bei unzureichendem Kontextfenster — vermeiden Sie es, den Platz aufzubrauchen
- Ausreichend Kontextplatz zu erhalten ist eine entscheidende Voraussetzung fuer eine erfolgreiche UltraPlan-Ausfuehrung

Wenn Sie Fragen oder Vorschlaege zum lokalisierten UltraPlan haben, eroeffnen Sie gerne [Issues auf GitHub](https://github.com/anthropics/claude-code/issues), um zu diskutieren und zusammenzuarbeiten.

---

## Funktionsweise

UltraPlan bietet zwei Betriebsmodi:

### Automatischer Modus
Analysiert automatisch die Aufgabenkomplexitaet (Score 4-12) und leitet an verschiedene Strategien weiter:

| Route | Score | Strategie |
|-------|-------|-----------|
| Route A | 4-6 | Leichtgewichtige Planung mit direkter Code-Erkundung |
| Route B | 7-9 | Planung mit Strukturdiagrammen (Mermaid / ASCII) |
| Route C | 10-12 | Multi-Agenten-Erkundung + Review-Kreislauf |

### Erzwungener Modus
Aktiviert direkt den vollstaendigen Route-C-Multi-Agenten-Workflow:
1. Bis zu 5 parallele Agenten einsetzen, die gleichzeitig die Codebasis erkunden (Architektur, Dateiidentifikation, Risikobewertung usw.)
2. Optional einen Recherche-Agenten einsetzen, um ueber webSearch Branchenloesungen zu untersuchen
3. Alle Agenten-Erkenntnisse zu einem detaillierten Implementierungsplan zusammenfassen
4. Einen Review-Agenten einsetzen, der den Plan aus mehreren Perspektiven prueft
5. Den Plan nach Genehmigung ausfuehren
6. Nach der Implementierung automatisch ein Code Review Team zusammenstellen, um die Codequalitaet zu validieren

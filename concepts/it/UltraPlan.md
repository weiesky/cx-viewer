# UltraPlan — La Macchina dei Desideri Definitiva

## Cos'e UltraPlan

UltraPlan e l'**implementazione localizzata** di cc-viewer del comando nativo `/ultraplan` di Claude Code. Permette di utilizzare le funzionalita complete di `/ultraplan` nel proprio ambiente locale **senza dover avviare il servizio remoto ufficiale di Claude**, guidando Claude Code nel portare a termine compiti complessi di pianificazione e implementazione utilizzando la **collaborazione multi-agente**.

Rispetto alla modalita Plan standard o ad Agent Team, UltraPlan puo:
- Valutare automaticamente la complessita del compito e selezionare la strategia di pianificazione ottimale
- Dispiegare piu agenti in parallelo per esplorare la codebase da diverse dimensioni
- Incorporare ricerche esterne (webSearch) per le migliori pratiche del settore
- Assemblare automaticamente un Code Review Team dopo l'esecuzione del piano per la revisione del codice
- Formare un ciclo chiuso completo **Plan → Execute → Review → Fix**

---

## Note Importanti

### 1. UltraPlan Non E Onnipotente
UltraPlan e una macchina dei desideri piu potente, ma cio non significa che ogni desiderio possa essere esaudito. E piu potente di Plan e Agent Team, ma non puo direttamente "farti guadagnare soldi". Considera una granularita dei compiti ragionevole — suddividi i grandi obiettivi in compiti medi eseguibili piuttosto che cercare di realizzare tutto in un colpo solo.

### 2. Attualmente Piu Efficace per Progetti di Programmazione
I modelli e i flussi di lavoro di UltraPlan sono profondamente ottimizzati per progetti di programmazione. Altri scenari (documentazione, analisi dati, ecc.) possono essere tentati, ma si consiglia di attendere gli adattamenti nelle versioni future.

### 3. Tempo di Esecuzione e Requisiti della Finestra di Contesto
- Un'esecuzione riuscita di UltraPlan richiede tipicamente **30 minuti o piu**
- Richiede che il MainAgent abbia una finestra di contesto ampia (modello Opus con 1M di contesto consigliato)
- Se si dispone solo di un modello 200K, **assicurarsi di eseguire `/clear` sul contesto prima dell'esecuzione**
- Il `/compact` di Claude Code funziona male quando la finestra di contesto e insufficiente — evitare di esaurire lo spazio
- Mantenere spazio di contesto sufficiente e un prerequisito critico per l'esecuzione riuscita di UltraPlan

Se hai domande o suggerimenti sull'UltraPlan localizzato, sentiti libero di aprire [Issues su GitHub](https://github.com/anthropics/claude-code/issues) per discutere e collaborare.

---

## Come Funziona

UltraPlan offre due modalita operative:

### Modalita Automatica
Analizza automaticamente la complessita del compito (punteggio 4-12) e instrada verso diverse strategie:

| Percorso | Punteggio | Strategia |
|----------|-----------|-----------|
| Percorso A | 4-6 | Pianificazione leggera con esplorazione diretta del codice |
| Percorso B | 7-9 | Pianificazione con diagrammi strutturali (Mermaid / ASCII) |
| Percorso C | 10-12 | Esplorazione multi-agente + ciclo chiuso di revisione |

### Modalita Forzata
Attiva direttamente il flusso di lavoro multi-agente completo del Percorso C:
1. Dispiegare fino a 5 agenti in parallelo per esplorare simultaneamente la codebase (architettura, identificazione file, valutazione rischi, ecc.)
2. Opzionalmente dispiegare un agente di ricerca per investigare soluzioni del settore tramite webSearch
3. Sintetizzare tutte le scoperte degli agenti in un piano di implementazione dettagliato
4. Dispiegare un agente di revisione per esaminare il piano da molteplici prospettive
5. Eseguire il piano una volta approvato
6. Assemblare automaticamente un Code Review Team per validare la qualita del codice dopo l'implementazione

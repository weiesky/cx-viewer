# UltraPlan — Den Ultimative Onskemaskine

## Hvad er UltraPlan

UltraPlan er cc-viewers **lokaliserede implementering** af Claude Codes native `/ultraplan`-kommando. Det giver dig mulighed for at bruge de fulde funktioner i `/ultraplan` i dit lokale miljo **uden at skulle starte Claudes officielle fjerntjeneste**, og guider Claude Code til at udfoere komplekse planlaegnings- og implementeringsopgaver ved hjaelp af **multi-agent-samarbejde**.

Sammenlignet med den almindelige Plan-tilstand eller Agent Team kan UltraPlan:
- Automatisk vurdere opgavekompleksitet og vaelge den optimale planlaegningsstrategi
- Indsaette flere parallelle agenter til at udforske kodebasen fra forskellige dimensioner
- Inkorporere ekstern research (webSearch) for branchens bedste praksisser
- Automatisk sammensaette et Code Review Team efter planens udfoerelse til kodegennemgang
- Danne en komplet **Plan → Execute → Review → Fix** lukket kredsloeb

---

## Vigtige Bemerkninger

### 1. UltraPlan Er Ikke Almaegtigt
UltraPlan er en mere kraftfuld onskemaskine, men det betyder ikke, at ethvert oenske kan opfyldes. Den er mere kraftfuld end Plan og Agent Team, men kan ikke direkte "tjene penge til dig". Overvej en rimelig opgavegranularitet — opdel store maal i udfoebare mellemstore opgaver i stedet for at proeve at opnaa alt paa en gang.

### 2. Aktuelt Mest Effektiv til Programmeringsprojekter
UltraPlans skabeloner og workflows er dybt optimeret til programmeringsprojekter. Andre scenarier (dokumentation, dataanalyse osv.) kan forsoges, men det kan vaere vaerd at vente paa tilpasninger i fremtidige versioner.

### 3. Koerselstid og Krav til Kontekstvindue
- En vellykket UltraPlan-koerelse tager typisk **30 minutter eller mere**
- Kraever at MainAgent har et stort kontekstvindue (1M context Opus-modellen anbefales)
- Hvis du kun har en 200K-model, **soerg for at `/clear` konteksten foer koerelse**
- Claude Codes `/compact` fungerer daarligt, naar kontekstvinduet er utilstraekkeligt — undgaa at loebe toer for plads
- At opretholde tilstraekkelig kontekstplads er en afgoerende forudsaetning for vellykket UltraPlan-udfoerelse

Hvis du har spoergsmaal eller forslag til den lokaliserede UltraPlan, er du velkommen til at aabne [Issues paa GitHub](https://github.com/anthropics/claude-code/issues) for at diskutere og samarbejde.

---

## Saadan Fungerer Det

UltraPlan tilbyder to driftstilstande:

### Automatisk Tilstand
Analyserer automatisk opgavekompleksiteten (score 4-12) og dirigerer til forskellige strategier:

| Rute | Score | Strategi |
|------|-------|----------|
| Rute A | 4-6 | Let planlaegning med direkte kodeudforskning |
| Rute B | 7-9 | Planlaegning med strukturdiagrammer (Mermaid / ASCII) |
| Rute C | 10-12 | Multi-agent-udforskning + gennemgangs-kredsloeb |

### Tvungen Tilstand
Aktiverer direkte det fulde Rute C multi-agent-workflow:
1. Indsaet op til 5 parallelle agenter til at udforske kodebasen samtidigt (arkitektur, filidentifikation, risikovurdering osv.)
2. Valgfrit indsaette en research-agent til at undersoege brancheloesninger via webSearch
3. Syntetisere alle agenternes fund til en detaljeret implementeringsplan
4. Indsaette en gennemgangsagent til at granske planen fra flere perspektiver
5. Udfoere planen efter godkendelse
6. Automatisk sammensaette et Code Review Team for at validere kodekvaliteten efter implementering

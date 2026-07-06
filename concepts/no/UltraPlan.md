# UltraPlan — Den Ultimate Ønskemaskinen

## Hva er UltraPlan

UltraPlan er cc-viewers **lokaliserte implementering** av Claude Codes native `/ultraplan`-kommando. Den lar deg bruke de fulle mulighetene til `/ultraplan` i ditt lokale miljø **uten å måtte starte Claudes offisielle fjerntjeneste**, og veileder Claude Code til å utføre komplekse planleggings- og implementeringsoppgaver ved hjelp av **multiagent-samarbeid**.

Sammenlignet med vanlig Plan-modus eller Agent Team, kan UltraPlan:
- Automatisk vurdere oppgavekompleksitet og velge den optimale planleggingsstrategien
- Distribuere flere parallelle agenter for å utforske kodebasen fra ulike dimensjoner
- Inkludere ekstern forskning (webSearch) for bransjens beste praksis
- Automatisk sette sammen et Code Review Team etter plangjennomføring for kodegjennomgang
- Danne en komplett lukket sløyfe **Plan → Utfør → Gjennomgå → Fiks**

---

## Viktige merknader

### 1. UltraPlan er ikke allmektig
UltraPlan er en kraftigere ønskemaskin, men det betyr ikke at ethvert ønske kan oppfylles. Den er kraftigere enn Plan og Agent Team, men kan ikke direkte «tjene penger for deg». Vurder rimelig oppgavegranularitet — del store mål inn i gjennomførbare mellomstore oppgaver i stedet for å prøve å oppnå alt på en gang.

### 2. For øyeblikket mest effektiv for programmeringsprosjekter
UltraPlans maler og arbeidsflyter er dypt optimalisert for programmeringsprosjekter. Andre scenarier (dokumentasjon, dataanalyse osv.) kan prøves, men du bør kanskje vente på tilpasninger i fremtidige versjoner.

### 3. Utføringstid og krav til kontekstvindu
- En vellykket UltraPlan-kjøring tar vanligvis **30 minutter eller mer**
- Krever at MainAgent har et stort kontekstvindu (Opus-modell med 1M kontekst anbefales)
- Hvis du bare har en 200K-modell, **sørg for å kjøre `/clear` på konteksten før kjøring**
- Claude Codes `/compact` fungerer dårlig når kontekstvinduet er utilstrekkelig — unngå å gå tom for plass
- Å opprettholde tilstrekkelig kontekstplass er en kritisk forutsetning for vellykket UltraPlan-gjennomføring

Hvis du har spørsmål eller forslag om den lokaliserte UltraPlan, er du velkommen til å åpne [Issues på GitHub](https://github.com/anthropics/claude-code/issues) for å diskutere og samarbeide.

---

## Hvordan det fungerer

UltraPlan tilbyr to driftsmoduser:

### Automatisk modus
Analyserer automatisk oppgavekompleksitet (poengsum 4-12) og ruter til ulike strategier:

| Rute | Poengsum | Strategi |
|------|----------|----------|
| Rute A | 4-6 | Lettvektsplanlegging med direkte kodeutforskning |
| Rute B | 7-9 | Planlegging med strukturelle diagrammer (Mermaid / ASCII) |
| Rute C | 10-12 | Multiagent-utforskning + lukket gjennomgangssløyfe |

### Tvungen modus
Aktiverer direkte den fullstendige Rute C multiagent-arbeidsflyten:
1. Distribuere opptil 5 parallelle agenter for å utforske kodebasen samtidig (arkitektur, filidentifikasjon, risikovurdering osv.)
2. Valgfritt distribuere en forskningsagent for å undersøke bransjeløsninger via webSearch
3. Syntetisere alle agentfunn til en detaljert implementeringsplan
4. Distribuere en gjennomgangsagent for å granske planen fra flere perspektiver
5. Utføre planen etter godkjenning
6. Automatisk sette sammen et Code Review Team for å validere kodekvalitet etter implementering

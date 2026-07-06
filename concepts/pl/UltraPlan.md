# UltraPlan — Najlepsza Maszyna Spełniająca Życzenia

## Czym jest UltraPlan

UltraPlan to **zlokalizowana implementacja** natywnego polecenia `/ultraplan` Claude Code przez cc-viewer. Pozwala na korzystanie z pełnych możliwości `/ultraplan` w lokalnym środowisku **bez konieczności uruchamiania oficjalnej zdalnej usługi Claude**, kierując Claude Code do realizacji złożonych zadań planowania i implementacji przy użyciu **współpracy wielu agentów**.

W porównaniu ze zwykłym trybem Plan lub Agent Team, UltraPlan potrafi:
- Automatycznie oceniać złożoność zadania i wybierać optymalną strategię planowania
- Wdrażać wielu równoległych agentów do eksploracji bazy kodu z różnych wymiarów
- Włączać badania zewnętrzne (webSearch) w celu poznania najlepszych praktyk branżowych
- Automatycznie tworzyć Zespół Code Review po wykonaniu planu w celu przeglądu kodu
- Tworzyć kompletną zamkniętą pętlę **Plan → Wykonanie → Przegląd → Naprawa**

---

## Ważne uwagi

### 1. UltraPlan nie jest wszechmocny
UltraPlan to potężniejsza maszyna spełniająca życzenia, ale to nie znaczy, że każde życzenie może być spełnione. Jest potężniejszy niż Plan i Agent Team, ale nie może bezpośrednio „zarabiać pieniędzy". Rozważ rozsądną granulację zadań — dziel duże cele na wykonalne średniej wielkości zadania zamiast próbować osiągnąć wszystko za jednym razem.

### 2. Obecnie najskuteczniejszy dla projektów programistycznych
Szablony i przepływy pracy UltraPlan są głęboko zoptymalizowane dla projektów programistycznych. Inne scenariusze (dokumentacja, analiza danych itp.) można wypróbować, ale warto poczekać na przyszłe wersje z odpowiednimi adaptacjami.

### 3. Czas wykonania i wymagania okna kontekstu
- Pomyślne uruchomienie UltraPlan zazwyczaj trwa **30 minut lub więcej**
- Wymaga, aby MainAgent posiadał duże okno kontekstu (zalecany model Opus z kontekstem 1M)
- Jeśli masz tylko model 200K, **upewnij się, że wykonasz `/clear` kontekstu przed uruchomieniem**
- Polecenie `/compact` Claude Code działa słabo, gdy okno kontekstu jest niewystarczające — unikaj wyczerpania miejsca
- Utrzymanie wystarczającej przestrzeni kontekstu jest kluczowym warunkiem pomyślnego wykonania UltraPlan

Jeśli masz jakiekolwiek pytania lub sugestie dotyczące zlokalizowanego UltraPlan, zapraszamy do otwarcia [Issues na GitHub](https://github.com/anthropics/claude-code/issues), aby dyskutować i współpracować.

---

## Jak to działa

UltraPlan oferuje dwa tryby działania:

### Tryb Automatyczny
Automatycznie analizuje złożoność zadania (wynik 4-12) i kieruje do różnych strategii:

| Trasa | Wynik | Strategia |
|-------|-------|-----------|
| Trasa A | 4-6 | Lekkie planowanie z bezpośrednią eksploracją kodu |
| Trasa B | 7-9 | Planowanie z diagramami strukturalnymi (Mermaid / ASCII) |
| Trasa C | 10-12 | Eksploracja wieloagentowa + zamknięta pętla przeglądu |

### Tryb Wymuszony
Bezpośrednio aktywuje pełny wieloagentowy przepływ pracy Trasy C:
1. Wdrożenie do 5 równoległych agentów do jednoczesnej eksploracji bazy kodu (architektura, identyfikacja plików, ocena ryzyka itp.)
2. Opcjonalne wdrożenie agenta badawczego do zbadania rozwiązań branżowych przez webSearch
3. Synteza wszystkich odkryć agentów w szczegółowy plan implementacji
4. Wdrożenie agenta przeglądowego do dokładnego zbadania planu z wielu perspektyw
5. Wykonanie planu po zatwierdzeniu
6. Automatyczne utworzenie Zespołu Code Review w celu walidacji jakości kodu po implementacji

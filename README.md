# CV jako kod

React + dane w JSON → PDF z prawdziwym tekstem (ATS-friendly) + automatyczne sprawdzenie, czy parser odczyta go poprawnie.

## Start (raz)

```bash
npm install
npx playwright install chromium
```

## Codzienna praca

```bash
npm run dev      # podgląd na żywo (http://localhost:5173), zmiany w plikach CV widać od razu
npm run cv       # build + PDF w out/cv.en.pdf + testy tekstu (PASS / WARN / FAIL)
```

Każdy wariant CV istnieje osobno dla każdego języka: `<wariant>.<pl|en>.json`. Bazowe CV to `cv.en.json` (domyślne) i `cv.pl.json`; oba są chronione przed usunięciem.

### Twoje dane vs przykład

- `examples/` - przykładowe, fikcyjne CV (John Smith po angielsku, Jan Kowalski po polsku), które są w repo. Tylko do odczytu.
- `data/` - **Twoje** CV. Folder jest w `.gitignore`, więc Twoje dane nigdy nie trafią do commita.
- Aplikacja i skrypty szukają wariantu najpierw w `data/`, potem w `examples/`. Zapis z paska zawsze idzie do `data/`, więc wystarczy otworzyć przykład, edytować i kliknąć **Save**, żeby mieć własną kopię. Własne zdjęcia lądują w `public/photos/` (też ignorowane).

```bash
npm run cv -- --data cv.pl     # jedna wersja -> out/cv.pl.pdf
npm run cv:all                 # wszystkie wersje z data/
```

W podglądzie wersję wybierasz przez `?data=cv.pl` w adresie albo z paska.

W prawym górnym rogu podglądu (tylko `npm run dev`) jest pływający, przeciągalny pasek:

- **menu pliku** (`cv ▾`) - lista wariantów w bieżącym języku do przełączania, **Duplikuj jako…** (kopia bieżącego stanu pod nową nazwą, w tym samym języku, nigdy nie nadpisuje istniejącego pliku) i **Usuń** (usuwa wersję w bieżącym języku; bazowe `cv` jest chronione),
- **Podgląd | Edycja** - w trybie edycji każdy tekst jest edytowalny (klik i pisz), bullet/projekt/firmę/wpis edukacji/grupę skilli/akapit przesuniesz strzałkami **↑ ↓**, usuniesz **×** i dodasz przyciskiem "+ …" (nowy element ma styl swojej sekcji, a jego tekst jest od razu zaznaczony do nadpisania; stanowiska, projekty i edukacja trafiają na górę listy, bo są od najnowszych), daty zmieniasz polami miesiąca. W podglądzie strona wygląda dokładnie jak zwykłe CV,
- **PL | EN** - pokazuje ten sam wariant w drugim języku. Jeśli tej wersji jeszcze nie ma, pasek proponuje ją utworzyć: kopia obecnej treści z nagłówkami sekcji i formatem dat drugiego języka, do przetłumaczenia w trybie edycji,
- **Cofnij** / **Ctrl+Z** (tylko w edycji) - cofa ostatnią zmianę: edycję tekstu, dodanie, usunięcie lub przesunięcie elementu, zmianę daty (do 100 kroków wstecz). W trakcie pisania w polu Ctrl+Z cofa samo pisanie, jak zwykle w przeglądarce,
- **Zapisz** (tylko w edycji) - zapisuje zmiany do otwartego wariantu; czerwona kropka = niezapisane zmiany (gaśnie też, gdy cofniesz wszystko do zapisanej wersji),
- **flaga** (na końcu paska) - pokazuje język, na który przełączysz interfejs (pasek, menu, przyciski edycji): 🇵🇱 gdy jest angielski, 🇬🇧 gdy polski. Niezależna od języka treści CV. Wybór zapamiętuje przeglądarka; domyślnie angielski,
- **PDF** - świeży PDF wyrenderowany tą samą logiką co `npm run cv` (bez okna drukowania, bez przebudowy). Powstaje z zapisanego pliku, więc przy niezapisanych zmianach pasek o tym ostrzega.

## Gdzie co jest

| Plik | Po co |
|---|---|
| `data/*.json` | Twoja treść CV, jeden plik = jedna wersja (ignorowane przez git) |
| `examples/*.json` | przykładowe, fikcyjne CV w repo |
| `scripts/data-files.mjs` | gdzie szukać pliku wariantu: najpierw `data/`, potem `examples/` |
| `src/App.tsx` | struktura i kolejność tekstu w PDF |
| `src/styles.css` | wygląd, marginesy A4, łamanie stron |
| `src/types.ts` | kształt danych |
| `scripts/render-pdf.mjs` | Chromium → PDF (CLI, zapisuje do pliku) |
| `scripts/pdf-renderer.mjs` | wspólna logika renderowania - używana przez CLI i przycisk pobierania w `npm run dev` (`vite.config.ts`) |
| `scripts/check-pdf.mjs` | testy „jak widzi to ATS” |
| `.cursor/rules/cv.mdc` | zasady dla Cursora (żeby nie psuł struktury) |

## Zdjęcie

Najprościej w trybie edycji: najedź na zdjęcie i kliknij **Change photo / Zmień zdjęcie** (albo **Add photo**, gdy go nie ma). Akceptowane są JPEG, PNG i WebP do 10 MB. Plik trafia do `public/photos/` pod nazwą z hasha treści, a ścieżka do `profile.photo`; zapisz CV, żeby zmiana została.

Ręcznie: wrzuć plik do `public/photos/` i w JSON ustaw np. `"photo": "./photos/moje-zdjecie.jpg"`.
(Zdjęcie jest opcjonalne; nie wpływa na tekst w PDF.)

## Co sprawdza `npm run cv`

Nazwisko jako pierwsza linia tekstu, nagłówki Skills / Experience / Education w kolejności, e-mail i telefon,
każda firma + rola + data startu, kolejność firm, kompletność każdego punktu (wykrywa ucięty tekst),
brak ligatur i dziwnych znaków, brak łamania linii po dywizie, liczba stron, brak „osieroconego” nagłówka na dole strony.
**FAIL** = popraw przed wysłaniem CV. **WARN** = zerknij.

## Zasady

- Treść tylko w `data/`, nie w komponentach.
- Jedna kolumna, bez tabel i pól tekstowych, bez `text-transform` na imieniu i `letter-spacing`.
- Projekty zagnieżdżone pod pracodawcą, nie jako osobne „firmy”.
- Po zmianach zawsze otwórz PDF i obejrzyj łamanie stron.

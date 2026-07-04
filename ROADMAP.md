# NEON ARÉNA — Fejlesztési munkamenet

Cél: teljes 3D-s, erős rendszerű Gladiatus-stílusú cyberpunk játék, portál-kiadásra alkalmas minőségben.

---

## 0. fázis — Alapozás (1-2 nap, ELSŐKÉNT!)
Nagy átépítés előtt kell, különben elveszítjük a kontrollt.

- [x] **Git repo** létrehozása (helyi kész; GitHub remote még hátravan) — verziókövetés, minden fázis külön commit
- [x] CrazyGames SDK doksik a projektben: `docs/sdk/` (4. fázishoz)
- [ ] Kód szétbontása: `index.html` + `css/style.css` + `js/data.js` (tárgyak, ellenfelek, helyszínek) + `js/game.js` (logika) + `js/ui.js` (a `js/battle3d.js` már külön van)
- [ ] Mentés-verziózás (`saveVersion` mező + migrációs lánc) — a régi játékosok mentése soha ne vesszen el
- [ ] Balansz-adatok (statképletek, szorzók) egy helyre gyűjtve, hogy könnyű legyen hangolni

## 1. fázis — Áttérés valódi 3D-re: Three.js (1-2 hét)
A CSS 3D-t kinőttük; igazi 3D-hez (karakterek, kamera, fények) Three.js kell.

- [x] Three.js beépítése (CDN r128, marad a statikus oldal; hiányára hibamentes fallback)
- [x] **3D harctér első kör**: `js/battle3d.js` — kódból épített low-poly karakterek (humanoid / nehézpáncélos / drón / bestia), idle-lebegés, támadás-lendülés, találat-villanás + kamera-rázás, bénítás-pörgés, halál-eldőlés; helyszín-színek a fényekben/rácsban; emoji→modell hozzárendelés
- [x] **3D harc v2 — profi animációk**: ízelt rigek (külön mozgó kar/láb/fej/törzs), futás-ciklus, berohanás→csapás→visszafutás, lövésnél célzás + torkolattűz + fénycsóva; effektek (szikra, lökéshullám, pengecsóva, pajzs, szétporladás); guard/stun/death/victory pózok; háttér-pilonok + fénypadok
- [x] **4 választható játékos-karakter**: Ronin (katana) / Bruiser (öklök) / Netrunner (iker-pengék) / Zsoldos (railpisztoly), karakterlapon forgó 3D előnézettel és választóval — később: skin-ek feloldása hírnévért/kreditért
- [x] **Igazi 3D modellek (KayKit, CC0)**: `models/` — 4 játékos-karakter + 4 csontváz-ellenfél, teljes animációkészlettel (Idle/Attack/Hit/Block/Death/Cheer), GLTFLoader + AnimationMixer; procedurális váz fallbacknek
- [ ] Modell-optimalizálás kiadás előtt: a 8 GLB ~33 MB (animációkkal) — töréskor: nem használt animációk kiszedése / meshopt tömörítés / lazy-load helyszínenként
- [ ] Cyberpunk-témájú modellcsere later: a KayKit fantasy-stílusú — ha találunk CC0 sci-fi karaktercsomagot (Quaternius Ultimate Space/Cyberpunk), egy map-cserével váltható
- [ ] **3D város-hub**: a mostani izometrikus város újraépítése Three.js-ben — forgatható/zoomolható kamera, épület-kattintás (raycast), neon anyagok + bloom utóeffekt
- [ ] **3D karakterek**: ingyenes low-poly modellek (Quaternius / Kenney / Mixamo) — játékos-modell + 8-10 ellenfél-modell (drón, kutya, szamuráj, robot, boss...), színvariánsokkal 36 ellenfélre szétosztva
- [ ] **Animációk** (Mixamo): idle, támadás, találat, védekezés, győzelem, halál
- [ ] **3D harctér**: a két karakter egy 3D arénában áll egymással szemben; helyszínenként saját színpad (roncstelep / piac / toronyház-tető / űrállomás); kamera-rándulás ütésnél
- [ ] Karakterlap: a 3D modell forog a paperdoll közepén, felszerelés láthatóan megjelenik rajta (fegyver a kézben)
- [ ] Teljesítmény: 60 FPS gyenge gépen is, mobil fallback

## 2. fázis — Erős játékrendszer (1-2 hét, párhuzamosan mehet)
Ez adja a hosszútávú megtartást — portálon ez dönt.

- [x] **Mind a 6 felszerelés-slot** élesítése (sisak, csizma, köpeny) — mentés-migrációval (saveV 2)
- [x] **Tárgy-generátor**: 5 ritkaság (Közönséges→Legendás) + random affix-bónuszok és nevek ("Villámgyors vaskard a Sólyom Szemével"); a Piactér generált készletet árul (újrakérés 25🪙)
- [x] **Boss-ellenfelek** helyszínenként (Mocsárkirály / Céh Nagymestere / Fekete Bajnok / Vérszárnyú) + garantált ritka+ drop, 1.35× modellméret — később: egyedi boss-mechanika (2 lépés telegraph)
- [x] **Portyák** (Gladiatus-mag!): 5/15/45 perces valós idejű küldetések, offline is telnek, visszaszámláló + begyűjtés
- [x] **Napi rendszer**: napi első győzelem bónusz — később: napi kihívás
- [x] **Képesség-fejlődés**: 6 képesség szintekhez kötve (3/5/7/9/12/15), harci képletekbe bekötve, karakterlapon listázva
- [x] **Krónika (achievementek)**: 10 cél jutalommal + VÉGCÉL (4 boss → "A Bajnokok Bajnoka" cím + Legendás tárgy) — az alapjáték íve kész
- [x] **Karakteralkotás**: első indításkor név + kaszt-választás + harci tipp
- [ ] **Crafting**: szétszerelés alkatrészekre → amulett-készítés (későbbre tolva)

## 3. fázis — Multiplayer (1 hét)
- [x] Supabase projekt + tábla (arena_champions, RLS) + Anonymous sign-ins
- [x] Névtelen azonosítás + karakter-szinkron (minden harc után auto-feltöltés)
- [x] **Élő ranglista** + aszinkron PvP (más játékosok mentett buildje ellen, az ő hős-modelljükkel) — MŰKÖDIK ÉLESBEN
- [ ] Szerveroldali validáció alapok (ne lehessen hamis statokat feltölteni)
- [ ] Később: klánok, heti bajnokság szezonokkal

## 4. fázis — Kiadásra készítés (1 hét)
- [ ] **Angol lokalizáció** (portálon kötelező; a magyar marad második nyelvnek) — szövegek kigyűjtése nyelvi fájlba
- [ ] Onboarding: 60 másodperces tutorial-harc, ami megtanítja a telegraph/ellenszer rendszert
- [ ] Hangok + zene (ingyenes: freesound, OpenGameArt)
- [ ] Mobil/érintőképernyő finomhangolás
- [ ] CrazyGames SDK integráció (reklám-pontok: harc után "dupla jutalom videóért", mentés-szinkron)
- [ ] Cover art + screenshotok + game leírás
- [ ] Beküldés CrazyGames-re → visszajelzés alapján iteráció

---

## Kiadási stratégia (döntés: 2026-07)

**Rövid válasz: a kettő nem zárja ki egymást — de hosszú távon a portál (CrazyGames) hozza a játékosokat és a pénzt, a saját oldal a "bázis".**

| Szempont | Saját weblap | CrazyGames |
|---|---|---|
| Játékosok | ~0, csak akit te hozol | milliós szerves forgalom |
| Bevétel | gyakorlatilag nincs (AdSense-hez óriási forgalom kell) | bevételmegosztás a reklámokból, játékidő után |
| Kontroll | teljes | szabályok + SDK kötelező |
| Kockázat | nincs elutasítás | átmehet/elutasíthatják (minőségi szűrő!) |

Terv: **CrazyGames az elsődleges cél**, a saját oldal (grushien.github.io) marad fejlesztői/béta verziónak és portfóliónak — a CrazyGames nem kér exkluzivitást, szóval mindkettő mehet. Tanulság a Grushflow-elutasításból: a "too generic" ellen az egyedi hook véd — itt ez a **telegraph-alapú taktikai harc + neon 3D látvány**. Ezért a beküldés CSAK a 4. fázis végén, teljes polish után történjen. Ha a CrazyGames nemet mond, a Poki és az itch.io a következő célpont.

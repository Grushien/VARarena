# VASVÁR ARÉNA — Végleges első kiadás terve (CrazyGames 1.0)

> **Hogyan használd ezt a fájlt:** ez egyben a munkautasítás (prompt) a következő
> fejlesztési körökhöz. Egy új munkamenetben elég ennyit írni:
> *„Olvasd be a KIADASI_TERV.md-t és dolgozd fel a P0-1, P0-2, P0-3 pontokat"* —
> minden szükséges kontextus itt van. A pontok sorszámozottak, fontossági
> sorrendben. A ✅ jelű tételek már készen vannak.
>
> Készült: 2026-07-05, teljes kód-átvilágítás (audit) után.
> A játék: egyetlen index.html + js/ modulok + models/ (36 MB) + Supabase backend.

---

## ÁLLAPOT RÖVIDEN

Működik: karakteralkotás, telegraph-harc 3D modellekkel, 4 helyszín + bossok,
tárgy-generátor, 6 slot, portyák, napi bónusz, Krónika-célok végcéllal,
élő ranglista + online PvP, klán (kassza + fejlesztés), levelezés,
játékos-piac + klán-piac (táska-választós eladással), HU/EN váltó, hangok,
CrazyGames SDK alap-bekötés, mobil CSS első kör.

---

## P0 — CRAZYGAMES BEKÜLDÉSI KÖTELEZŐK (enélkül elutasítanak)

**P0-1. Angol alapnyelv nem-magyar játékosoknak.**
Jelenleg mindenki magyarul indul. A CG közönsége nemzetközi.
Teendő: első indításkor (ha nincs mentett `va_lang`) a CG SDK
`user.systemInfo.locale` értékéből dönteni: `hu-*` → HU, minden más → EN.
CG-n kívül (saját oldal): `navigator.language` ugyanígy. A mentett választás
mindig felülír. Fájl: `js/i18n.js` (lang inicializálás) + `js/cgsdk.js` (locale kiolvasás).

**P0-2. CrazyGames Data Module integráció (mentés-szinkron).**
A CG beküldésnél van egy „Progress Save" kapcsoló. Ha data module-t jelölünk,
TELJESEN arra kell támaszkodni. A data module API-ja localStorage-azonos.
Teendő: a `save()`/`load()` függvényekben CG-környezetben a
`window.CrazyGames.SDK.data`-t használni localStorage helyett (a meglévő
localStorage marad a saját oldalon). Első CG-indításnál a localStorage-ból
átmásolni, ha van (docs: docs/sdk/Data.txt). Fájl: index.html (save/load) + cgsdk.js.

**P0-3. Betöltőképernyő (cím-képernyő).**
Most a modellek „bepattannak", nincs első benyomás. Teendő: egyszerű
címképernyő (logó + „A PORONDRA" gomb) — ez legyen az első felhasználói
gesztus (ez oldja fel az audiót is), közben töltsenek a City3D modellek.
A CG `loadingStart/loadingStop` ehhez kötve (most azonnal stop-ol — javítandó).

**P0-4. Asset-méret csökkentés (36 MB → cél 15 MB alá).**
A 8 karakter-GLB adja a zömét (4×4.8 MB skeleton + 4×3.6 MB hős).
Teendő: gltfpack/meshopt vagy Draco tömörítés a models/ GLB-ken
(parancssori gltfpack elérhető npm-ről; -cc kapcsolóval 60-80% csökkenés
várható). A betöltőkód változatlan maradhat (Three.js loader + meshopt dekóder CDN-ről).

**P0-5. Reklám-szabályok végső QA.**
- Első interakció ELŐTT semmilyen ad nem mehet (most: midgame a 4. harc után → oké).
- Rewarded gomb csak CG-környezetben látszik (megvan).
- Ad alatt némítás (megvan), játék állapota nem sérülhet.
- Adblockkal a játék teljes értékűen fusson (elvileg oké — tesztelni!).

**P0-6. Beküldési anyagok (ezt a játékos/tulaj készíti):**
- Cover art (CG méretek a dev portálon), 3-5 screenshot, angol játékleírás,
- kategória: RPG / Idle; címkék: medieval, turn-based, multiplayer,
- QA-kör a CG Preview Toolban (developer portal → upload → preview).

---

## P1 — HIBÁK ÉS HIÁNYOK (auditból; kiadás előtt javítandó)

**P1-1. ✅ KÉSZ — Kaszt-váltó eltávolítva a karakterlapról.**
Kasztot csak az első belépéskor (karakteralkotáskor) lehet választani;
a karakterlapon már csak felirat mutatja („Lovag kaszt").

**P1-2. ✅ KÉSZ — Tele táskával vásárlás aranyvesztése.**
Eddig: az arany levonódott, a tárgy csendben elveszett. Most: a vásárlás
előre elutasítódik „Tele a táskád" üzenettel (mindkét piacon).

**P1-3. „Új karakter" jelenleg SEHOL nem érhető el.**
A menüből kikerült (kérésre), a reset() árván maradt. Döntés kell:
(a) így marad (CG-n a mentés fiókhoz kötött, nem gond), vagy
(b) apró „Új karakter kezdése" gomb a Krónika alján dupla megerősítéssel. — Javaslat: (b).

**P1-4. Halott kód takarítás.** `trainCost()`, `game.train` és a coin-wrapper
'train' bejegyzése már nem elérhető a UI-ról → törölni.

**P1-5. Piaci staging index-elavulás.** A `marketStageIdx` index-alapú:
ha kiválasztott tárgy mellett a táska máshol változik, rossz tárgy kerülhet ki.
Javítás: uid-alapú kiválasztás (`state.inventory.find(i => i.uid === ...)`).

**P1-6. Eladott („ELADVA") piaci sor nem tüntethető el.** Kis „✓ OK" gomb,
ami törli a lezárt hirdetést a saját listából.

**P1-7. Név-egyediség nincs az online térben.** Két játékos azonos névvel
összekeverhető (levél címzés első találatra megy). V1-re elég jelezni a
levélküldésnél; később: név-foglalás a regisztrációnál.

**P1-8. Klánvezető kilépése árva klánt hagy.** V1-re elfogadható;
későbbre: vezetőátadás vagy klán-törlés, ha a vezető kilép.

**P1-9. Levél-arany átvétel elvi duplikálhatósága** (két eszköz egyszerre
kattint) — alacsony kockázat, későbbi RPC-vel (claim_mail függvény) zárható.

---

## P2 — KINÉZET-POLISH (a „jó első benyomás" kör)

**P2-1. Harctéri névtáblák.** A 3D modellek FÖLÉ lebegő név (te + ellenfél),
ahogy a városban az épületeknél — így egyértelmű, ki kivel harcol.
(A City3D label-technika újrahasznosítható a battle3d-ben.)

**P2-2. Eredmény-overlay felturbózása.** Zsákmány tárgy-képpel (ModelSnap),
nagyobb győzelem/vereség dramaturgia, megszerzett szint/képesség kiemelése.

**P2-3. Kereskedő-kártyák és staging-dobozok vizuális egységesítése**
(azonos kártyakeret, azonos gombsor-elrendezés).

**P2-4. Város: koppintás/hover visszajelzés erősítése** (kijelölt épület
glow + label-kiemelés már van, mobilon koppintásra is villanjon).

**P2-5. Favicon + PWA manifest** (cím, ikon, theme-color) — telefonon
„kezdőképernyőre telepíthető" érzet, CG-n is profibb.

**P2-6. Címképernyő art** (P0-3-mal együtt): a 3D város háttérként a
betöltő mögött, logóval.

---

## P3 — MOBIL KIALAKÍTÁS (dedikált kör, valós eszközön tesztelve)

**P3-1. Teljes bejárás 360–430 px szélességen,** képernyőnként ellenőrizve:
karakteralkotó overlay, staging (két oszlop → egymás alá törjön),
ranglista táblázat görgetése, klán űrlapok, levelek, harc-gombok elérhetősége.

**P3-2. Érintés-célpontok:** bag-cellák és gombok min. 44 px; a város
drag-forgatása ne akadjon össze az oldal-görgetéssel (touch-action megvan, tesztelni).

**P3-3. Mobil teljesítmény:** a városban 12+ PointLight van (fáklyák) —
mobilon maximum 4-6 fényre csökkenteni (távolság szerint), fps-mérés;
pixelRatio sapka megvan (2), mobilon 1.5-re vehető.

**P3-4. iOS Safari sajátosságok:** WebAudio feloldás (megvan gesztusra),
WebGL memória, `100vh` viselkedés — tesztelni, javítani ami tör.

**P3-5. Fekvő mód:** harc közben fekvőben is férjen el az 5 akciógomb + napló.

---

## P4 — BALANSZ (számhangolás, gyors kör)

**P4-1. Boss-görbe.** 1-2. szinten a boss gyakorlatilag verhetetlen
(teszt: 52 kör / vereségek). Teendő: a boss-kártyán „Ajánlott szint: X"
felirat + korai szinteken szelídebb szorzó (pl. 2.0 → 1.6 az 5. szint alatt).

**P4-2. Arany-áramlás.** Források (harc, portya, napi, célok) vs. nyelők
(étel, gyógyítás, bolt, klán-adomány) átszámolása — cél: az 5. szintig
mindig legyen értelmes költési döntés, de ne legyen aranybőség.

**P4-3. Mágia-build életképesség.** Rontás-esély görbe és a Mágus (staff)
sebzésprofil ellenőrzése — ne legyen csapda-választás kezdőknek.

**P4-4. Portya vs. aktív játék.** A 45 perces Nagy hadjárat jutalma ne érje
meg jobban, mint 10 perc aktív harc (különben a játék „kikapcsolós" lesz).

---

## KIADÁS ELŐTTI TESZTLISTA (mindet kipipálni)

1. [ ] Friss profil, EN nyelven, végigjátszás az első boss-győzelemig — akadás nélkül
2. [ ] Ugyanez mobilon (valódi telefon, nem csak emulátor)
3. [ ] Adblockkal: minden működik, reklámhiba nem töri a játékot
4. [ ] CG Preview Toolban: init, loading, gameplay események látszanak a logban
5. [ ] Mentés-átvitel: CG data module-lal eszközváltásnál megmarad a karakter
6. [ ] Két eszköz: piac (kitesz→megvesz→levél megérkezik→arany átvehető), klán (alapít→csatlakozik→adomány→fejlesztés)
7. [ ] Konzol: nulla error minden képernyőn
8. [ ] Betöltési idő mérés (cél: <10 mp átlagos kapcsolaton az első interakcióig)

---

## JAVASOLT SORREND (munkamenetenként)

1. **P0-1 + P0-2 + P1-3 + P1-4 + P1-5 + P1-6** (nyelv-alapértelmezés, CG mentés, apró javítások) — 1 kör
2. **P0-3 + P0-4** (címképernyő + asset-tömörítés) — 1 kör
3. **P3 mobil-kör** (valós eszközzel a kezedben) — 1 kör
4. **P2 kinézet-kör + P4 balansz** — 1-2 kör
5. **Tesztlista + P0-5/P0-6 + beküldés** — 1 kör

*Modell-tipp: az 1. és 4. pont mechanikusabb részei mehetnek Sonneten;
a P0-4 tömörítés és a P3 mobil-teljesítmény érdemben Fable/Opus kört érdemel.*

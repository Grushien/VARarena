'use strict';
/* ============================================================
   VASVÁR ARÉNA (IRONHOLD ARENA) — kétnyelvű megjelenítés
   Futásidejű szótáras fordító: a magyar JS-logikát nem kell
   átírni, csak a megjelenő DOM-szöveget cseréljük EN módban.
   Váltás: HU->EN azonnali (in-place), EN->HU egy reload
   (biztonságos, mert harc közben a váltás le van tiltva).
============================================================ */
window.I18N = (function () {
  const KEY = 'va_lang';
  let lang = localStorage.getItem(KEY) || 'hu';

  const DICT = {
    // --- márka / cím ---
    'VASVÁR ARÉNA': 'IRONHOLD ARENA',
    'BAJNOKOK KORA': 'AGE OF CHAMPIONS',
    'Bajnokok Kora': 'Age of Champions',
    'ÜDVÖZÖL VASVÁR!': 'WELCOME TO IRONHOLD!',
    'VASVÁR — RANGLISTA': 'IRONHOLD — LEADERBOARD',
    'VASVÁR': 'IRONHOLD',
    'Night District 7': 'Ironhold',

    // --- fejléc / oldalsáv ---
    'BAJNOK': 'CHAMPION', 'SZINT': 'LEVEL', 'HÍRNÉV': 'FAME', 'ARANY': 'GOLD',
    'ÉLETERŐ': 'HEALTH', 'TAPASZTALAT': 'EXPERIENCE',
    'ENERGIA: ': 'ENERGY: ',

    // --- menü ---
    'ÁTTEKINTÉS': 'OVERVIEW', 'ARÉNA': 'ARENA', 'PORTYA': 'EXPEDITION',
    'PIACTÉR': 'MARKET', 'ISPOTÁLY': 'INFIRMARY', 'KARAKTER': 'CHARACTER',
    'RANGLISTA': 'LEADERBOARD', 'KRÓNIKA': 'CHRONICLE',
    'VÁROS': 'TOWN', 'BAJNOK menü': 'CHAMPION menu',

    // --- városnézet ---
    'A város a tiéd, bajnok. Kattints egy épületre — húzd az egeret a körbenézéshez!':
      'The town is yours, champion. Click a building — drag to look around!',
    'harc és dicsőség': 'battle and glory',
    'vásár': 'trade',
    'gyógyír': 'healing',
    'a nagy torony': 'the great tower',
    'fegyver · páncél · amulett': 'weapons · armor · amulets',
    'edzés · gyógyulás': 'training · healing',
    'top bajnokok': 'top champions',

    // --- karakter képernyő ---
    'BAJNOK-PROFIL': 'CHAMPION PROFILE', 'RUNNER-PROFIL': 'CHAMPION PROFILE',
    '// FELSZERELÉS': '// EQUIPMENT', '// KÉPESSÉGEK': '// ABILITIES', '// TÁSKA': '// INVENTORY',
    'Elosztható stat pont: ': 'Unspent stat points: ',
    'SISAK': 'HELMET', 'FEGYVER': 'WEAPON', 'PÁNCÉL': 'ARMOR',
    'AMULETT': 'AMULET', 'KÖPENY': 'CLOAK', 'CSIZMA': 'BOOTS',
    '— üres —': '— empty —', 'üres slot': 'empty slot',
    ' — kattints a levételhez': ' — click to unequip',
    'A táskád üres — nézz szét a Piactéren!': 'Your bag is empty — check out the Market!',
    'Kattints egy tárgyra a részletekhez!': 'Click an item for details!',
    'FELVESZ': 'EQUIP', 'ELAD ': 'SELL ',
    'Sebzés: ': 'Damage: ', 'Páncél: ': 'Armor: ', 'Kritikus: ': 'Critical: ',
    'Max HP: ': 'Max HP: ', 'Rontás-esély: ': 'Curse chance: ',

    // --- statok ---
    'Erő': 'Strength', 'Ügyesség': 'Agility', 'Reflex': 'Reflex',
    'Mágia': 'Magic', 'Kitartás': 'Vitality',
    'növeli a sebzést': 'increases damage',
    'találati és kitérési esély': 'hit and dodge chance',
    'kritikus találat esélye': 'critical hit chance',
    'a rontás erőssége és esélye': 'curse power and chance',
    'maximális életerő': 'maximum HP',

    // --- akciók (harci képességek) ---
    'Gyors csapás': 'Quick Strike', 'Erős csapás': 'Heavy Strike',
    'Védekezés': 'Guard', 'Rontás': 'Curse', 'Gyógyital': 'Potion',
    '70% sebzés, +10% találat, +15 energia. Megszakítja az ellenfél varázslását.':
      '70% damage, +10% hit, +15 energy. Interrupts enemy spellcasting.',
    '170% sebzés, -10% találat. Áttöri a védekezést.':
      '170% damage, -10% hit. Breaks through guard.',
    '60% sebzéscsökkentés, +25 energia. Erős csapásra visszatámad.':
      '60% damage reduction, +25 energy. Counters heavy strikes.',
    'Mágia-alapú esély: az ellenfél kihagyja a következő körét.':
      'Magic-based chance to make the enemy skip its next turn.',
    'Gyógyít 30% életerőt. Meccsenkét 2× használható.':
      'Heals 30% HP. Usable 2× per match.',
    'ingyenes': 'free', ' energia': ' energy', '× maradt': '× left',
    '★ ELLENSZER': '★ COUNTER',

    // --- perkek ---
    'Gyors csapás II': 'Quick Strike II', 'Rontás II': 'Curse II',
    'Gyógyital II': 'Potion II', 'Erős csapás II': 'Heavy Strike II',
    'Védekezés II': 'Guard II', 'Halálos precizitás': 'Deadly Precision',
    'A gyors csapás sebzése 70% → 85%': 'Quick Strike damage 70% → 85%',
    '+10% rontás-esély': '+10% curse chance',
    '3 gyógyital meccsenkét': '3 potions per match',
    'Az erős csapás sebzése 170% → 200%': 'Heavy Strike damage 170% → 200%',
    'Erősebb blokk és visszatámadás': 'Stronger block and counterattack',
    '+8% kritikus esély': '+8% critical chance',
    '. szinttől': ' level req.', 'AKTÍV': 'ACTIVE',

    // --- rangok ---
    'Névtelen Szolga': 'Nameless Servant', 'Porond-harcos': 'Pit Fighter',
    'Az Aréna Farkasa': 'Wolf of the Arena', 'Vasbajnok': 'Iron Champion',
    'A Király Kegyeltje': "The King's Favorite", 'Élő Legenda': 'Living Legend',
    'A Bajnokok Bajnoka': 'Champion of Champions',

    // --- helyszínek ---
    'Sárfészek': 'Mudhollow', 'Piactéri Porond': 'Market Pit',
    'Várudvar': 'Castle Yard', 'Sárkányverem': 'Dragon Pit',
    'Lepukkant falu széli porond a mocsár mellett — itt kezd minden bajnok.':
      'A run-down village pit by the swamp — every champion starts here.',
    'Falu széli porond a mocsár mellett — itt kezd minden bajnok.':
      'A village-edge pit by the swamp — every champion starts here.',
    'Zsúfolt vásártér — a tolvajcéh szemmel tart.': 'A crowded marketplace — watched by the thieves\' guild.',
    'A király várának porondja — páncélos veteránok földje.': "The king's castle pit — home of armored veterans.",
    'Ősi kazamata a hegy gyomrában — innen kevesen térnek vissza.': 'An ancient dungeon deep in the mountain — few return from here.',
    'Jutalom ×': 'Reward ×', '🔒 ': '🔒 ',
    'Válassz helyszínt és ellenfelet! Az erősebb ellenfél és a veszélyesebb porond többet fizet.':
      'Choose a location and opponent! Tougher foes and deadlier pits pay more.',
    'Az erősebb ellenfél több kreditet, XP-t és hírnevet ad — de a vereség kreditbe kerül.':
      'Tougher enemies give more gold, XP and fame — but defeat costs gold.',
    'Túl gyenge vagy a harchoz — gyógyulj meg az Ispotályban!': "You're too weak to fight — heal up at the Infirmary!",

    // --- ellenfelek (a 4 helyszín szörnynevei) ---
    'Óriáspatkány': 'Giant Rat', 'Részeg útonálló': 'Drunken Bandit',
    'Csontváz szolga': 'Skeleton Thrall', 'Éhes farkas': 'Hungry Wolf',
    'Kóbor zsoldos': 'Wandering Mercenary', 'Orvvadász': 'Poacher',
    'Mocsári rém': 'Swamp Horror', 'A Patkánykirály': 'The Rat King',
    'Vérszomjas Ordas': 'Bloodthirsty Warg', 'Lápi boszorkány': 'Bog Witch',
    'A Mocsárkirály': 'The Swamp King',
    'Zsebmetsző': 'Pickpocket', 'Piaci tolvaj': 'Market Thief',
    'Kóbor véreb': 'Stray Hound', 'Céhes verőlegény': 'Guild Enforcer',
    'Álarcos orgyilkos': 'Masked Assassin', 'Vándor kardmester': 'Wandering Swordmaster',
    'A Céhmester': 'The Guildmaster', 'Méregkeverő': 'Poison Brewer',
    'Hírhedt fejvadász': 'Infamous Bounty Hunter', 'A Céh Nagymestere': 'The Guild Grandmaster',
    'Újonc strázsa': 'Rookie Guard', 'Fegyverhordozó': 'Squire',
    'A várnagy vérebe': "The Castellan's Hound", 'Veterán zsoldos': 'Veteran Mercenary',
    'Udvari varázsló': 'Court Wizard', 'Páncélos lovag': 'Armored Knight',
    'A Király Bajnoka': "The King's Champion", 'Fekete Lovag': 'Black Knight',
    'Udvari főmágus': 'Court Archmage', 'A Fekete Bajnok': 'The Black Champion',
    'Pincelidérc': 'Cellar Wraith', 'Óriáspók': 'Giant Spider',
    'Csontharcos': 'Bone Warrior', 'Nekromanta': 'Necromancer',
    'Kriptaszörny': 'Crypt Horror', 'Sírrabló': 'Grave Robber',
    'A Lidérckirály': 'The Wraith King', 'Ősi Sárkányfattyú': 'Ancient Dragonspawn',
    'Halálmágus': 'Death Mage', 'Vérszárnyú, az Ősi Sárkány': 'Bloodwing, the Ancient Dragon',
    'KÖNNYŰ': 'EASY', 'KIEGYENLÍTETT': 'BALANCED', 'HALÁLOS': 'DEADLY',
    'BOSS': 'BOSS', 'HARC!': 'FIGHT!', 'MEGKÜZDÖK VELE!': 'FACE THE BOSS!',
    'garantált ritka tárgy!': 'guaranteed rare item!',
    'Nyeremény: ': 'Reward: ',

    // --- riválisok (PvP) ---
    'Fekete Björn': 'Black Björn', 'Vasökrű Ulf': 'Iron-Ox Ulf', 'Morgana': 'Morgana',
    'Szélfútta Kara': 'Windswept Kara', 'Vörös Rikárd': 'Red Rikard', 'Némabárd': 'Silent Bard',
    'Ezüsthajú Eszter': 'Silverhair Eszter', 'Kőmarok Gerő': 'Stonefist Gerő',
    'Villámkezű Vid': 'Lightning-Hand Vid', 'Hollószem Hanna': 'Ravenseye Hanna',
    'Ordas Endre': 'Warg Endre', 'Sánta Farkas': 'Limping Wolf',
    'Helyi riválisok': 'Local rivals',
    'Egyelőre helyi riválisok — hamarosan élő játékosok!': 'Local rivals for now — real players coming soon!',
    'Hívd ki a többi bajnokot a hírnevükért! Győzelem: +hírnév és arany. Vereség: -hírnév.':
      'Challenge other champions for their fame! Win: +fame and gold. Lose: -fame.',
    'ÉLŐ RANGLISTA': 'LIVE LEADERBOARD', 'valódi játékosok, hívd ki őket!': 'real players, challenge them!',
    'az élő lista még üres vagy nem elérhető': 'the live list is empty or unavailable',
    'KIHÍVÁS': 'CHALLENGE', 'PÁRBAJ — BAJNOKOK HARCA': 'DUEL — CLASH OF CHAMPIONS',

    // --- tárgy-generátor ---
    'Közönséges': 'Common', 'Kiváló': 'Fine', 'Ritka': 'Rare', 'Epikus': 'Epic', 'Legendás': 'Legendary',
    'Vaskard': 'Iron Sword', 'Vadászkés': 'Hunting Knife', 'Buzogány': 'Mace',
    'Hosszúkard': 'Longsword', 'Csatabárd': 'Battleaxe', 'Számszeríj': 'Crossbow',
    'Pallos': 'Greatsword', 'Rúnapenge': 'Runeblade',
    'Bőrvért': 'Leather Armor', 'Vastagbőr zeke': 'Thick Hide Jerkin', 'Láncing': 'Chainmail',
    'Pikkelyvért': 'Scale Mail', 'Lemezvért': 'Plate Armor', 'Bajnoki vért': "Champion's Plate",
    'Bőrsapka': 'Leather Cap', 'Vassisak': 'Iron Helm', 'Zárt sisak': 'Closed Helm',
    'Rohamsisak': 'Battle Helm', 'Sárkánysisak': 'Dragon Helm',
    'Rongyos csizma': 'Ragged Boots', 'Bőrcsizma': 'Leather Boots',
    'Vasalt csizma': 'Ironclad Boots', 'Lovagi csizma': "Knight's Boots", 'Sárkánybőr csizma': 'Dragonhide Boots',
    'Gyapjúköpeny': 'Wool Cloak', 'Utazóköpeny': 'Traveler\'s Cloak',
    'Címeres köpeny': 'Heraldic Cloak', 'Bajnoki palást': "Champion's Mantle", 'Árnyékköpeny': 'Shadow Cloak',
    'Csont amulett': 'Bone Amulet', 'Réz talizmán': 'Copper Talisman', 'Ezüst medál': 'Silver Medallion',
    'Arany talizmán': 'Golden Talisman', 'Rúnakő': 'Runestone',
    'Erős': 'Mighty', 'Fürge': 'Swift', 'Villámgyors': 'Lightning-Fast',
    'Rúnavésett': 'Rune-Etched', 'Rendíthetetlen': 'Unshakable',
    'a Bika Erejével': 'of the Bull\'s Strength', 'a Macska Kegyével': 'of the Cat\'s Grace',
    'a Sólyom Szemével': "of the Hawk's Eye", 'az Ősök Igéjével': 'of the Ancients\' Word',
    'a Medve Szívével': "of the Bear's Heart",
    '. szint': ' lvl.', 'MEGVAN': 'OWNED', 'VESZEM': 'BUY',
    'A kereskedő készlete a szintedhez igazodik, és minden szintlépésnél frissül. Eladni a karakterlapon tudsz.':
      "The merchant's stock matches your level and refreshes on level-up. Sell items on the Character screen.",
    'ÚJ KÉSZLET — ': 'NEW STOCK — ', 'Elfogyott az áru — kérj új készletet!': 'Out of stock — request a new delivery!',
    'Friss áru érkezett a Piactérre!': 'Fresh goods arrived at the Market!',

    // --- portyák ---
    'A csapatod úton van... nyugodtan harcolhatsz közben.': "Your party is on the road... feel free to fight in the meantime.",
    'A csapat visszatért!': 'The party has returned!', 'ZSÁKMÁNY BEGYŰJTÉSE': 'COLLECT LOOT',
    'Küldd portyára a csapatod — valós időben telik, akkor is, ha bezárod a játékot!':
      'Send your party on an expedition — it runs in real time, even if you close the game!',
    'A portya helyszíne: ': 'Expedition location: ', ' (jutalom ×': ' (reward ×',
    ') — az Aréna fülön válthatsz helyszínt.': ') — change location on the Arena tab.',
    'Már úton van egy portyád!': 'An expedition is already underway!',
    ' perc múlva térnek vissza.': ' minutes until they return.', 'A portya elindult! ': 'Expedition launched! ',
    'Rövid portya': 'Short Patrol', 'Vadászat': 'Hunt', 'Nagy hadjárat': 'Grand Campaign',
    'Gyors körkép a környéken.': 'A quick sweep of the area.',
    'Fejvadász-megbízás a helyi urakért.': 'Bounty work for local lords.',
    'Hosszú menet — garantált zsákmánnyal.': 'A long march — guaranteed loot.',
    'Garantált tárgy!': 'Guaranteed item!', 'Tárgyesély: ': 'Item chance: ',
    'INDÍTÁS': 'LAUNCH', 'PORTYA VÉGE': 'EXPEDITION COMPLETE',

    // --- ispotály / ételek ---
    'Percenként ': 'Every minute, ', ' magától visszatölt — itt étellel és gyógyítással gyorsíthatsz.':
      ' regenerates on its own — speed it up here with food and healing.',
    '(Stat pontokat a Karakter oldalon tudsz elosztani.)': '(Spend stat points on the Character screen.)',
    'Friss cipó': 'Fresh Bread', 'Sült csülök': 'Roast Knuckle', 'Hősök lakomája': "Heroes' Feast",
    '+${f.hp} életerő azonnal': '', // handled generically below
    'életerő azonnal': 'HP instantly', 'MEGESZEM': 'EAT',
    'AZ ÉLETERŐD TELE VAN': 'YOUR HP IS FULL', 'GYÓGYULÁS (': 'HEAL (',
    'Életerő feltöltve!': 'HP restored!',

    // --- krónika / célok ---
    'A tetteid könyve — teljesítsd a célokat, és vedd át a jutalmad!': 'The book of your deeds — complete goals and claim your reward!',
    'A végső cél: győzd le mind a 4 helyszín bossát, és légy ': 'Ultimate goal: defeat all 4 location bosses and become ',
    'Első vér': 'First Blood', 'Nyerd meg az első arénaharcod': 'Win your first arena battle',
    'A porond veteránja': 'Pit Veteran', '25 győzelem': '25 wins',
    'Ismert név': 'A Known Name', 'Érj el 300 hírnevet': 'Reach 300 fame',
    'Tizedik szint': 'Tenth Level', 'Érd el a 10. szintet': 'Reach level 10',
    'Teli erszény': 'Full Purse', 'Gyűjts össze 2000 aranyat': 'Collect 2000 gold',
    'A Mocsár ura': 'Lord of the Swamp', 'Győzd le A Mocsárkirályt': 'Defeat The Swamp King',
    'A Céh réme': 'Terror of the Guild', 'Győzd le A Céh Nagymesterét': 'Defeat The Guild Grandmaster',
    'Lovagok végzete': "Knights' Doom", 'Győzd le A Fekete Bajnokot': 'Defeat The Black Champion',
    'Sárkányölő': 'Dragonslayer', 'Győzd le Vérszárnyút': 'Defeat Bloodwing',
    'A BAJNOKOK BAJNOKA': 'CHAMPION OF CHAMPIONS',
    'Győzd le mind a 4 helyszín bossát — ezzel megnyerted az alapjátékot!':
      'Defeat all 4 location bosses — you have won the base game!',
    'teljesítve': 'completed', 'folyamatban': 'in progress', 'ÁTVESZEM': 'CLAIM',
    '+ 🎁 Legendás tárgy': '+ 🎁 Legendary item',

    // --- karakteralkotás ---
    'Add meg a neved, válassz kasztot, és lépj a porondra!': 'Enter your name, choose a class, and step into the pit!',
    'Harci tipp:': 'Combat tip:',
    'az ellenfél mindig előre jelzi a szándékát — figyeld a ':
      'the enemy always telegraphs its intent — watch for the ',
    ' jelölést, és foroghatsz fölébe akkor is, ha gyengébb vagy!':
      ' marker, and you can outplay even stronger foes!',
    'A neved...': 'Your name...', 'A PORONDRA!': 'ENTER THE PIT!',
    'Lovag': 'Knight', 'Barbár': 'Barbarian', 'Mágus': 'Mage', 'Vadász': 'Ranger',
    'Kard és pajzs — a porond veteránja': 'Sword and shield — veteran of the pit',
    'Kétkezes csatabárd — nyers erő': 'Two-handed axe — raw power',
    'Varázsbot — messziről sújt le': 'Staff — strikes from afar',
    'Számszeríj — hidegvérű mesterlövész': 'Crossbow — cold-blooded marksman',
    'Kaszt kiválasztva.': 'Class selected.',
    'Sok szerencsét a porondon, ': 'Good luck in the pit, ',
    'Új bajnok a porondon: ': 'New champion in the pit: ',

    // --- harc: telegraph / szándék ---
    'Gyors támadásra készül': 'is preparing a quick attack',
    'MAGASRA EMELI A FEGYVERÉT — erős csapás jön!': 'raises its weapon high — a heavy strike is coming!',
    'Védekező állásba helyezkedik': 'takes a defensive stance',
    'Sötét igét mormol — rontást szór rád!': 'mutters a dark incantation — casting a curse on you!',
    'LEBÉNULVA — kihagyja a kört!': 'STUNNED — skips its turn!',

    // --- harci napló ---
    'Te: ': 'You: ',
    'A tömeg üvölt. ': 'The crowd roars. ', ' belép az arénába! ': ' enters the arena! ',
    ' — az ellenfél kitért! (': ' — the enemy dodged! (', '% esélyed volt)': '% chance)',
    'megszakította az ellenfél varázslását!': "interrupted the enemy's spellcasting!",
    'védekező állás. (+25 energia)': 'defensive stance. (+25 energy)',
    'Rontás sikeres! (': 'Curse successful! (', ') — ': ') — ',
    ' megdermed a rontástól!': ' is frozen by the curse!',
    'a rontás MEGHIÚSULT. (': 'the curse FAILED. (', '% esély volt)': '% chance)',
    'VISSZATÁMADÁS! ': 'COUNTERATTACK! ', ' sebzést vittél be!': ' damage dealt!',
    'Bénult vagy, a köröd kimarad!': "You're stunned, your turn is skipped!",
    ' bénultan tántorog — kimarad a köre!': ' staggers, stunned — its turn is skipped!',
    ' védekezett ebben a körben.': ' defended this round.',
    ' MEGÁTKOZOTT! A következő köröd kimarad... ': ' CURSED you! Your next turn is skipped... ',
    ' rontása megtört az akaraterődön.': "'s curse broke against your willpower.",
    ' támad — de blokkoltad! Csak ': ' attacks — but you blocked it! Only ',
    'ERŐS CSAPÁS': 'HEAVY STRIKE', 'gyors támadás': 'quick attack',
    ' támadott, de kitértél!': ' attacked, but you dodged!',
    ' sebzés': ' damage', 'KRITIKUS!': 'CRITICAL!', '(blokkolta)': '(blocked)',
    'ÁTTÖRTE A VÉDEKEZÉST!': 'BROKE THROUGH THE GUARD!',
    'KITÉRT': 'DODGED', 'KITÉRTÉL': 'DODGED', 'STUN': 'STUN', 'HACKELVE': 'CURSED',

    // --- eredmény / jutalom ---
    'GYŐZELEM': 'VICTORY', 'VERESÉG': 'DEFEAT', 'PORTYA VÉGE': 'EXPEDITION COMPLETE',
    'A medikusok kihúztak az arénából...': 'The medics dragged you out of the arena...',
    ' arany': ' gold', ' hírnév': ' fame',
    'SZINTLÉPÉS! Most ': 'LEVEL UP! You are now level ', '. szintű vagy (+3 stat pont)': ' (+3 stat points)',
    'Új képesség: ': 'New ability: ',
    'Zsákmány: ': 'Loot: ', 'tele a táskád, eladva +': "bag full, sold for +",
    '🎁 A BAJNOKOK BAJNOKA LETTÉL!': '🎁 YOU ARE THE CHAMPION OF CHAMPIONS!',
    '🎬 DUPLA ARANY VIDEÓÉRT': '🎬 WATCH AD FOR DOUBLE GOLD', '🎬 +': '🎬 +', ' jutalom!': ' bonus!',
    'FOLYTATÁS': 'CONTINUE', 'Tele a táskád!': 'Your bag is full!',

    // --- hírcsatorna (áttekintés) ---
    'A HÍRNÖK SZAVA:': "THE HERALD'S WORD:",
    'A ranglistát jelenleg ': 'The leaderboard is currently led by ',
    'TE vezeted! 👑': 'YOU! 👑', ' vezeti': '',
    ' — te a ': ' — you are ranked ', '. helyen állsz.': '.',
    'Rangod: ': 'Your rank: ', ' hírnév)': ' fame)',
    'Sérült vagy — irány az Ispotály!': "You're wounded — head to the Infirmary!",
    'Harcra kész állapotban vagy.': "You're ready for battle.",
    ' győzelem · ': ' wins · ', ' vereség': ' losses',
    '⭐ ': '⭐ ', ' — ': ' — ',

    // --- egyéb ---
    'Előbb fejezd be a harcot!': 'Finish the fight first!',
    'ÚJ KARAKTER': 'NEW CHARACTER',

    // --- levelek / klán / piac ---
    'LEVELEK': 'MAIL', 'KLÁN': 'CLAN',
    'Küldj üzenetet más bajnokoknak — az eladott piaci tárgyaid aranya is itt érkezik.':
      "Send messages to other champions — gold from your market sales arrives here too.",
    'ÚJ ÜZENET': 'NEW MESSAGE', 'Címzett neve...': "Recipient's name...", 'Üzeneted...': 'Your message...',
    'KÜLDÉS': 'SEND', 'ÁTVESZ': 'CLAIM', 'olvasva': 'read', 'Üres a postaládád.': 'Your inbox is empty.',
    'Nincs online kapcsolat': 'No online connection', 'a levelezéshez internet szükséges': 'internet is required for mail',
    'Még nem vagy egyik klánnak sem a tagja.': "You're not a member of any clan yet.",
    'ÚJ KLÁN ALAPÍTÁSA': 'FOUND A NEW CLAN', 'CSATLAKOZÁS': 'JOIN',
    'Klán neve...': 'Clan name...', 'Rövid jelzés (pl. VAS)': 'Short tag (e.g. IRON)',
    'ALAPÍTÁS': 'FOUND', 'Klán neve vagy jelzése...': 'Clan name or tag...',
    'KILÉPÉS A KLÁNBÓL': 'LEAVE CLAN', ' tag': ' members',
    'KERESKEDŐ': 'MERCHANT', 'JÁTÉKOS PIAC': 'PLAYER MARKET',
    'Add el a fölösleges zsákmányod más bajnokoknak, vagy vegyél tőlük olcsóbban!':
      'Sell your spare loot to other champions, or buy from them for less!',
    'SAJÁT HIRDETÉSEID': 'YOUR LISTINGS', 'ELADVA': 'SOLD', 'VISSZAVON': 'CANCEL',
    'Eladó: ': 'Seller: ', 'Jelenleg nincs semmi eladó.': 'Nothing for sale right now.',
    'PIACRA': 'LIST',
    'szintű klán': 'level clan', 'jutalom minden tagnak': 'reward for all members',
    'KLÁN KASSZA: ': 'CLAN TREASURY: ', 'Adományozz aranyat a kasszába — ebből fejlesztheti a vezető a klánt.':
      'Donate gold to the treasury — the leader can use it to upgrade the clan.',
    'ADOMÁNYOZÁS': 'DONATE', 'KLÁN FEJLESZTÉSE': 'UPGRADE CLAN',
    'Költség: ': 'Cost: ', ' a kasszából. Minden szint +2% arany/XP jutalmat ad a tagoknak.':
      ' from the treasury. Each level gives +2% gold/XP to all members.',
    'FEJLESZTÉS (': 'UPGRADE (', '// KLÁN-PIAC': '// CLAN MARKET',
    'Nincs klán-piaci kínálat.': 'No items listed on the clan market.',
    'Minden ritkaság': 'All rarities', 'Minden kategória': 'All categories',
  };

  const keys = Object.keys(DICT).sort((a, b) => b.length - a.length);

  function translate(s) {
    if (lang !== 'en' || !s) return s;
    let out = s;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (out.indexOf(k) !== -1) out = out.split(k).join(DICT[k]);
    }
    return out;
  }

  function walk(node) {
    if (node.nodeType === 3) {
      const t = translate(node.nodeValue);
      if (t !== node.nodeValue) node.nodeValue = t;
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    if (node.hasAttribute) {
      for (const attr of ['placeholder', 'title']) {
        if (node.hasAttribute(attr)) {
          const v = node.getAttribute(attr);
          const t = translate(v);
          if (t !== v) node.setAttribute(attr, t);
        }
      }
    }
    const kids = node.childNodes;
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function applyAll() {
    if (lang !== 'en') return;
    walk(document.body);
    document.title = translate(document.title);
  }

  let scheduled = false;
  function schedule() {
    if (lang !== 'en' || scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; applyAll(); }, 0);
  }

  function startObserving() {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function setBtn() {
    const b = document.getElementById('langBtn');
    if (b) b.textContent = lang === 'hu' ? '🌐 EN' : '🌐 HU';
  }

  function toggle() {
    if (window.combat && !combat.over) {
      if (window.toast) toast(lang === 'hu' ? 'Előbb fejezd be a harcot!' : 'Finish the fight first!');
      return;
    }
    if (lang === 'en') {
      localStorage.setItem(KEY, 'hu');
      location.reload();
      return;
    }
    lang = 'en';
    localStorage.setItem(KEY, 'en');
    document.documentElement.lang = 'en';
    applyAll();
    setBtn();
  }

  window.addEventListener('load', () => {
    startObserving();
    document.documentElement.lang = lang === 'en' ? 'en' : 'hu';
    if (lang === 'en') applyAll();
    setBtn();
  });

  return { toggle, get lang() { return lang; } };
})();

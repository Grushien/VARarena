'use strict';
/* ============================================================
   NEON ARÉNA — 3D harctér v3 (Three.js)
   Részletes, többrétegű karakterrigek kéttagú végtagokkal,
   fegyverek, effektek, választható skinek.
   Ha a Three.js nem tölt be, a játék 3D nélkül fut tovább.
============================================================ */
window.Battle3D = (function () {
  const LOC_ACCENT = { rust: 0x7dc95e, market: 0xffd24d, chrome: 0x8fb8e8, orbit: 0xa06bd6, pvp: 0xd8442e };

  /* Választható játékos-karakterek (a mentés-kompatibilitás miatt az id-k maradnak) */
  const SKINS = [
    { id: 'ronin',     name: 'Lovag',  desc: 'Kard és pajzs — a porond veteránja',  body: 0x3a4a6e, accent: 0x8fb8e8, crest: 0xd8442e, weapon: 'katana', build: 'humanoid' },
    { id: 'bruiser',   name: 'Barbár', desc: 'Kétkezes csatabárd — nyers erő',      body: 0x45322a, accent: 0xf0a63c, crest: 0xf0a63c, weapon: 'fists',  build: 'heavy' },
    { id: 'netrunner', name: 'Mágus',  desc: 'Varázsbot — messziről sújt le',       body: 0x2c2148, accent: 0xa06bd6, crest: 0xa06bd6, weapon: 'staff',  build: 'slim' },
    { id: 'zsoldos',   name: 'Vadász', desc: 'Számszeríj — hidegvérű mesterlövész', body: 0x22392f, accent: 0x7dc95e, crest: 0x7dc95e, weapon: 'gun',    build: 'humanoid' },
  ];

  /* ---- GLB modellek (KayKit, CC0 — models/LICENSE-*.txt) ---- */
  const MODEL_MAP = {
    ronin:     { url: 'models/Knight.glb',           h: 1.8 },
    bruiser:   { url: 'models/Barbarian.glb',        h: 1.85 },
    netrunner: { url: 'models/Mage.glb',             h: 1.78 },
    zsoldos:   { url: 'models/Rogue_Hooded.glb',     h: 1.75 },
    humanoid:  { url: 'models/Skeleton_Rogue.glb',   h: 1.7 },
    heavy:     { url: 'models/Skeleton_Warrior.glb', h: 1.85 },
    drone:     { url: 'models/Skeleton_Mage.glb',    h: 1.75 },
    beast:     { url: 'models/Skeleton_Minion.glb',  h: 1.45 },
  };
  const CLIP_PATTERNS = {
    idle:    [/^idle$/i, /idle/i],
    run:     [/^running_a$/i, /running/i, /^walking_a$/i, /walk/i],
    attack:  [/1h_melee_attack_slice_diagonal/i, /1h_melee_attack_chop/i, /melee_attack_slice/i, /melee_attack/i, /attack/i],
    heavy:   [/2h_melee_attack_spinning/i, /2h_melee_attack_slam/i, /melee_attack_stab/i, /2h_melee_attack/i, /attack/i],
    shoot:   [/ranged_shoot/i, /shooting/i, /spellcast_shoot/i, /spellcasting/i, /spellcast/i, /throw/i, /attack/i],
    hit:     [/^hit_a$/i, /hit_a/i, /hit/i],
    block:   [/^block$/i, /blocking/i, /block/i],
    stun:    [/hit_b/i, /hit/i],
    death:   [/^death_a$/i, /death/i],
    victory: [/cheer/i, /victory|wave/i, /interact/i],
  };
  const gltfCache = {};
  function loadGLTF(url) {
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return Promise.reject(new Error('no loader'));
    if (!gltfCache[url]) {
      gltfCache[url] = new Promise((res, rej) => new THREE.GLTFLoader().load(url, res, undefined, rej));
    }
    return gltfCache[url];
  }
  function findClip(clips, kind) {
    if (!clips) return null;
    for (const re of CLIP_PATTERNS[kind] || []) {
      const c = clips.find(cl => re.test(cl.name));
      if (c) return c;
    }
    return null;
  }
  function playClip(b, kind, once) {
    if (!b.mixer || !b.clips) return null;
    const clip = findClip(b.clips, kind);
    if (!clip) return null;
    const action = b.mixer.clipAction(clip);
    if (b.current === action && !once) return action;
    if (b.current && b.current !== action) b.current.fadeOut(0.14);
    action.reset().fadeIn(0.14).play();
    if (once) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    else action.setLoop(THREE.LoopRepeat, Infinity);
    b.current = action;
    return action;
  }
  function applyModel(b, gltf, targetH) {
    if (b.disposed || b.dead || !THREE.SkeletonUtils) return;
    const clone = THREE.SkeletonUtils.clone(gltf.scene);
    const bbox = new THREE.Box3().setFromObject(clone);
    const h = Math.max(0.01, bbox.max.y - bbox.min.y);
    clone.scale.setScalar(targetH / h);
    for (let i = b.g.children.length - 1; i >= 0; i--) {
      const ch = b.g.children[i];
      b.g.remove(ch);
      ch.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
    }
    b.g.add(clone);
    b.model = true;
    b.mixer = new THREE.AnimationMixer(clone);
    b.clips = gltf.animations || [];
    b.current = null;
    b.phongs = []; b.fadeMats = [];
    clone.traverse(o => {
      if (o.isMesh && o.material) {
        o.material = o.material.clone();
        o.frustumCulled = false;
        b.fadeMats.push(o.material);
        if (o.material.emissive) b.phongs.push(o.material);
      }
    });
    b.mixer.addEventListener('finished', () => {
      if (!b.dead) playClip(b, 'idle');
    });
    playClip(b, 'idle');
  }

  let renderer = null, scene, camera, stage, grid, lightL, lightR;
  let backdropCaps = [];
  let padP = null, padE = null;
  let bots = { player: null, enemy: null };
  let effects = [];
  let camShake = 0, camPunch = 0;
  let running = false;
  let lastT = 0;

  function threeOk() { return typeof THREE !== 'undefined'; }

  /* ============================================================
     SEGÉDEK
  ============================================================ */
  function mat(c, shin) { return new THREE.MeshPhongMaterial({ color: c, shininess: shin || 30, flatShading: true }); }
  function glow(c) { return new THREE.MeshBasicMaterial({ color: c }); }
  function fxMat(c, op) {
    return new THREE.MeshBasicMaterial({
      color: c, transparent: true, opacity: op === undefined ? 1 : op,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
  }
  function box(w, h, d, m, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  function cyl(rt, rb, h, m, x, y, z, seg) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), m);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  function sph(r, m, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  function pivot(px, py, pz) {
    const g = new THREE.Group();
    g.position.set(px, py, pz);
    return g;
  }
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeInOut = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  /* ============================================================
     INICIALIZÁLÁS
  ============================================================ */
  function init() {
    if (renderer) return true;
    if (!threeOk()) return false;
    stage = document.getElementById('battleStage');
    if (!stage) return false;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0c0805, 11, 26);

    camera = new THREE.PerspectiveCamera(40, 2, 0.1, 60);
    camera.position.set(0, 2.4, 6.4);
    camera.lookAt(0, 1.0, 0);

    scene.add(new THREE.AmbientLight(0xb09a7a, 0.66));
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(2, 8, 6);
    scene.add(key);
    lightL = new THREE.PointLight(0xffb85c, 1.3, 16);
    lightL.position.set(-4, 3, 2.5);
    scene.add(lightL);
    lightR = new THREE.PointLight(0xd8442e, 1.3, 16);
    lightR.position.set(4, 3, 2.5);
    scene.add(lightR);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshPhongMaterial({ color: 0x171008, shininess: 10 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    grid = new THREE.GridHelper(40, 40, 0xf0a63c, 0x3a2c18);
    grid.material.transparent = true;
    grid.material.opacity = 0.32;
    grid.position.y = 0.01;
    scene.add(grid);

    const bd = new THREE.Group();
    const xs = [-8.5, -6, -3.5, 3.5, 6, 8.5];
    for (let i = 0; i < xs.length; i++) {
      const h = 2.4 + (i % 3) * 1.3;
      const pil = box(0.55, h, 0.55, mat(0x241a10), xs[i], h / 2, -5.2);
      const cap = box(0.62, 0.12, 0.62, glow(0xff9a3c), xs[i], h + 0.06, -5.2);
      backdropCaps.push(cap.material);
      bd.add(pil, cap);
    }
    scene.add(bd);

    function makePad(c, x) {
      const p = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 36), fxMat(c, 0.5));
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.02, 0);
      scene.add(p);
      return p;
    }
    padP = makePad(0xffd24d, -2.1);
    padE = makePad(0xd8442e, 2.1);

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(loop);
    return true;
  }

  function resize() {
    if (!renderer || !stage) return;
    const w = stage.clientWidth || 600;
    const h = stage.clientHeight || 280;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ============================================================
     FEGYVEREK (az alkarhoz csatolva)
  ============================================================ */
  function attachWeapon(parts, weapon, accent) {
    const A = glow(accent), DK = mat(0x10141f, 60);
    if (weapon === 'katana') {
      const w = new THREE.Group();
      w.add(cyl(0.035, 0.035, 0.22, DK, 0, 0, 0));            // markolat
      w.add(box(0.16, 0.03, 0.09, mat(0x2a3352, 60), 0, 0.12, 0)); // keresztvas
      w.add(box(0.055, 0.85, 0.02, mat(0x39415f, 80), 0, 0.55, 0)); // penge
      w.add(box(0.02, 0.85, 0.028, A, 0.028, 0.55, 0));       // izzó él
      w.position.set(0, -0.42, 0.1);
      w.rotation.x = 0.5;
      parts.foreR.add(w);
      parts.weaponType = 'melee';
    } else if (weapon === 'fists') {
      for (const fore of [parts.foreR, parts.foreL]) {
        const f = new THREE.Group();
        f.add(box(0.24, 0.2, 0.26, mat(0x3a4260, 80), 0, 0, 0));
        f.add(box(0.26, 0.06, 0.28, A, 0, 0.08, 0));           // izzó bütyöksor
        for (let i = -1; i <= 1; i++) f.add(box(0.05, 0.09, 0.06, DK, i * 0.08, 0.14, 0.08));
        f.position.set(0, -0.42, 0.02);
        fore.add(f);
      }
      parts.weaponType = 'melee';
    } else if (weapon === 'blades') {
      for (const fore of [parts.foreR, parts.foreL]) {
        const b = new THREE.Group();
        b.add(cyl(0.03, 0.03, 0.14, DK, 0, 0, 0));
        b.add(box(0.04, 0.5, 0.02, mat(0x39415f, 80), 0, 0.3, 0));
        b.add(box(0.016, 0.5, 0.026, A, 0.022, 0.3, 0));
        b.position.set(0, -0.42, 0.08);
        b.rotation.x = 0.6;
        fore.add(b);
      }
      parts.weaponType = 'melee';
    } else if (weapon === 'staff') {
      const st = new THREE.Group();
      st.add(cyl(0.03, 0.035, 1.1, mat(0x3a2a18, 40), 0, 0.25, 0));
      st.add(sph(0.09, A, 0, 0.85, 0));
      const muz = new THREE.Group();
      muz.position.set(0, 0.85, 0);
      st.add(muz);
      st.position.set(0, -0.42, 0.08);
      parts.foreR.add(st);
      parts.muzzle = muz;
      parts.weaponType = 'ranged';
    } else if (weapon === 'gun') {
      const g = new THREE.Group();
      g.add(box(0.09, 0.16, 0.3, DK, 0, 0, 0.05));             // tok
      g.add(cyl(0.035, 0.035, 0.42, mat(0x2a3352, 60), 0, 0.03, 0.32)); // cső
      g.children[1].rotation.x = Math.PI / 2;
      g.add(box(0.03, 0.05, 0.12, A, 0, 0.1, 0.22));           // célzó-sín
      g.add(box(0.06, 0.09, 0.09, A, 0, -0.02, -0.12));        // energiacella
      const muz = new THREE.Group();
      muz.position.set(0, 0.03, 0.55);
      g.add(muz);
      g.position.set(0, -0.42, 0.1);
      parts.foreR.add(g);
      parts.muzzle = muz;
      parts.weaponType = 'ranged';
    } else {
      parts.weaponType = 'melee';
    }
  }

  /* ============================================================
     HUMANOID RIG v3 — kéttagú végtagok, páncélrétegek
  ============================================================ */
  function rigHumanoid(colors, buildKind) {
    const s = buildKind === 'heavy' ? 1.22 : buildKind === 'slim' ? 0.88 : 1;
    const P = mat(colors.body);                 // fő páncél
    const P2 = mat(0x1a2138, 50);               // sötét váz/ízület
    const P3 = mat(0x323d68, 55);               // világosabb lemez
    const A = glow(colors.accent);
    const g = new THREE.Group();
    const parts = { kind: 'humanoid' };

    /* ---- lábak: comb (csípő-pivot) + lábszár (térd-pivot) + lábfej ---- */
    function makeLeg(sideX) {
      const thigh = pivot(sideX * 0.2 * s, 0.98, 0);
      thigh.add(box(0.2 * s, 0.42, 0.24 * s, P, 0, -0.21, 0));
      thigh.add(box(0.03, 0.3, 0.02, A, sideX * 0.105 * s, -0.2, 0.11)); // fénycsík
      thigh.add(sph(0.1 * s, P2, 0, -0.45, 0));                          // térd
      const shin = pivot(0, -0.45, 0);
      shin.add(box(0.16 * s, 0.4, 0.19 * s, P2, 0, -0.22, 0));
      shin.add(box(0.18 * s, 0.14, 0.06, P3, 0, -0.14, 0.1));            // lábszárvédő
      shin.add(box(0.2 * s, 0.1, 0.34 * s, P2, 0, -0.48, 0.06));         // lábfej
      shin.add(box(0.2 * s, 0.04, 0.1, A, 0, -0.46, 0.2));               // orr-fény
      thigh.add(shin);
      return { thigh, shin };
    }
    const L = makeLeg(-1), R = makeLeg(1);
    parts.legL = L.thigh; parts.shinL = L.shin;
    parts.legR = R.thigh; parts.shinR = R.shin;
    g.add(L.thigh, R.thigh);

    /* ---- medence + öv ---- */
    g.add(box(0.48 * s, 0.2, 0.3 * s, P2, 0, 1.02, 0));
    g.add(box(0.52 * s, 0.08, 0.34 * s, P3, 0, 1.12, 0));
    g.add(box(0.1, 0.12, 0.06, P3, -0.16 * s, 1.0, 0.16 * s)); // övtáskák
    g.add(box(0.1, 0.12, 0.06, P3, 0.16 * s, 1.0, 0.16 * s));

    /* ---- törzs (derék-pivot) ---- */
    const torso = pivot(0, 1.16, 0);
    torso.add(box(0.4 * s, 0.22, 0.28 * s, P2, 0, 0.1, 0));                 // has
    torso.add(box(0.62 * s, 0.44, 0.4 * s, P, 0, 0.42, 0));                 // mellkas
    torso.add(box(0.5 * s, 0.3, 0.05, P3, 0, 0.44, 0.21 * s));              // mellvért
    torso.add(box(0.13, 0.13, 0.05, A, 0, 0.46, 0.245 * s));                // izzó mag
    torso.add(box(0.4 * s, 0.34, 0.14, P2, 0, 0.42, -0.26 * s));            // hátizsák
    const ex1 = cyl(0.045, 0.045, 0.2, P2, -0.12 * s, 0.62, -0.3 * s);
    const ex2 = cyl(0.045, 0.045, 0.2, P2, 0.12 * s, 0.62, -0.3 * s);
    torso.add(ex1, ex2);
    torso.add(box(0.06, 0.03, 0.06, A, -0.12 * s, 0.73, -0.3 * s));         // kipufogó-izzás
    torso.add(box(0.06, 0.03, 0.06, A, 0.12 * s, 0.73, -0.3 * s));

    /* vállvédők neon szegéllyel */
    for (const sx of [-1, 1]) {
      torso.add(box(0.3 * s, 0.22, 0.36 * s, P, sx * 0.5 * s, 0.6, 0));
      torso.add(box(0.32 * s, 0.04, 0.38 * s, A, sx * 0.5 * s, 0.7, 0));
    }

    /* ---- karok: felkar (váll-pivot) + alkar (könyök-pivot) + kéz ---- */
    function makeArm(sideX) {
      const upper = pivot(sideX * 0.52 * s, 0.56, 0);
      upper.add(box(0.15 * s, 0.34, 0.18 * s, P, 0, -0.18, 0));
      upper.add(sph(0.085 * s, P2, 0, -0.37, 0));                // könyök
      const fore = pivot(0, -0.37, 0);
      fore.add(box(0.13 * s, 0.32, 0.15 * s, P2, 0, -0.18, 0));
      fore.add(box(0.15 * s, 0.06, 0.17 * s, A, 0, -0.1, 0));    // alkar-fénygyűrű
      fore.add(box(0.13 * s, 0.11, 0.15 * s, P3, 0, -0.4, 0.02)); // kéz
      upper.add(fore);
      return { upper, fore };
    }
    const AL = makeArm(-1), AR = makeArm(1);
    parts.armL = AL.upper; parts.foreL = AL.fore;
    parts.armR = AR.upper; parts.foreR = AR.fore;
    torso.add(AL.upper, AR.upper);

    /* ---- fej (nyak-pivot): sisak, vizor, állvédő, szellőzők, taréj ---- */
    const head = pivot(0, 0.72, 0);
    head.add(cyl(0.09, 0.11, 0.1, P2, 0, 0.02, 0));               // nyak
    head.add(box(0.34, 0.3, 0.36, P, 0, 0.22, 0));                // sisak
    head.add(box(0.29, 0.1, 0.05, A, 0, 0.24, 0.185));            // vizor
    head.add(box(0.3, 0.09, 0.3, P2, 0, 0.06, 0.05));             // állvédő
    head.add(box(0.05, 0.14, 0.14, P2, -0.195, 0.2, 0));          // szellőzők
    head.add(box(0.05, 0.14, 0.14, P2, 0.195, 0.2, 0));
    head.add(box(0.02, 0.08, 0.02, A, -0.21, 0.22, 0));
    head.add(box(0.02, 0.08, 0.02, A, 0.21, 0.22, 0));
    if (buildKind === 'heavy') {
      head.add(box(0.42, 0.06, 0.42, P3, 0, 0.4, 0));             // parancsnoki lemez
      head.add(cyl(0.015, 0.015, 0.24, P2, 0.16, 0.52, -0.1));    // antenna
      head.add(sph(0.03, A, 0.16, 0.65, -0.1));
    } else {
      head.add(box(0.045, 0.26, 0.3, glow(colors.crest || 0xff2d78), 0, 0.44, -0.02)); // taréj
    }
    parts.head = head;
    torso.add(head);

    parts.torso = torso;
    g.add(torso);
    g.scale.setScalar(0.92);
    return { g, parts, height: 1.9, floaty: false };
  }

  /* ============================================================
     BESTIA RIG v3 — nyak, állkapocs, agyarak, karmok, tüskék
  ============================================================ */
  function rigBeast(colors) {
    const P = mat(colors.body), P2 = mat(0x161c2e, 50), A = glow(colors.accent);
    const g = new THREE.Group();
    const parts = { kind: 'beast' };

    const torso = pivot(0, 0.64, 0);
    torso.add(box(0.5, 0.42, 0.72, P, 0, 0, -0.1));               // törzs
    torso.add(box(0.42, 0.36, 0.4, P, 0, 0.03, 0.38));            // mellkas
    /* hát-tüskesor izzó csíkkal */
    torso.add(box(0.06, 0.1, 0.7, A, 0, 0.24, -0.05));
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), P2);
      spike.position.set(0, 0.3, 0.25 - i * 0.2);
      torso.add(spike);
    }
    /* nyak + fej + állkapocs */
    const neck = pivot(0, 0.12, 0.56);
    neck.add(box(0.26, 0.24, 0.24, P2, 0, 0, 0.06));
    const head = pivot(0, 0.04, 0.2);
    head.add(box(0.34, 0.26, 0.36, P, 0, 0.06, 0.14));
    head.add(box(0.08, 0.07, 0.06, A, -0.1, 0.13, 0.31));         // szemek
    head.add(box(0.08, 0.07, 0.06, A, 0.1, 0.13, 0.31));
    head.add(box(0.1, 0.1, 0.14, P2, -0.14, 0.24, -0.02));        // fülek
    head.add(box(0.1, 0.1, 0.14, P2, 0.14, 0.24, -0.02));
    const jaw = pivot(0, -0.04, 0.1);
    jaw.add(box(0.26, 0.09, 0.3, P2, 0, -0.02, 0.12));
    for (const fx of [-0.09, 0.09]) {                              // agyarak
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), glow(0xffffff));
      fang.position.set(fx, 0.05, 0.24);
      fang.rotation.x = Math.PI;
      jaw.add(fang);
    }
    parts.jaw = jaw;
    head.add(jaw);
    parts.head = head;
    neck.add(head);
    torso.add(neck);
    const tail = pivot(0, 0.1, -0.48);
    tail.add(box(0.09, 0.09, 0.4, P2, 0, 0, -0.2));
    tail.add(box(0.05, 0.05, 0.2, A, 0, 0, -0.42));
    parts.tail = tail;
    torso.add(tail);
    parts.torso = torso;
    g.add(torso);

    /* lábak karmokkal */
    function makeLeg(x, z) {
      const leg = pivot(x, 0.46, z);
      leg.add(box(0.13, 0.34, 0.16, P2, 0, -0.16, 0));
      leg.add(box(0.15, 0.08, 0.2, P, 0, -0.4, 0.03));
      for (let i = -1; i <= 1; i++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), glow(0xffffff));
        claw.position.set(i * 0.05, -0.42, 0.14);
        claw.rotation.x = Math.PI / 2;
        leg.add(claw);
      }
      return leg;
    }
    parts.legFL = makeLeg(-0.18, 0.3);
    parts.legFR = makeLeg(0.18, 0.3);
    parts.legBL = makeLeg(-0.18, -0.32);
    parts.legBR = makeLeg(0.18, -0.32);
    g.add(parts.legFL, parts.legFR, parts.legBL, parts.legBR);
    return { g, parts, height: 1.05, floaty: false };
  }

  /* ============================================================
     DRÓN RIG v3 — rétegelt test, hajtómű-gondolák, lencse, ágyú
  ============================================================ */
  function rigDrone(colors) {
    const P = mat(colors.body), P2 = mat(0x161c2e, 50), P3 = mat(0x323d68, 55), A = glow(colors.accent);
    const g = new THREE.Group();
    const parts = { kind: 'drone' };
    const torso = pivot(0, 1.18, 0);
    torso.add(box(0.62, 0.34, 0.62, P, 0, 0, 0));                 // fő test
    torso.add(box(0.5, 0.1, 0.5, P3, 0, 0.22, 0));                // felső lemez
    torso.add(box(0.34, 0.08, 0.34, P2, 0, 0.3, 0));
    torso.add(cyl(0.015, 0.015, 0.3, P2, 0.1, 0.48, -0.08));      // antennák
    torso.add(sph(0.03, A, 0.1, 0.64, -0.08));
    torso.add(cyl(0.012, 0.012, 0.2, P2, -0.14, 0.42, 0.04));
    /* hajtómű-gondolák */
    for (const sx of [-1, 1]) {
      torso.add(box(0.16, 0.26, 0.34, P2, sx * 0.44, -0.06, -0.06));
      torso.add(box(0.1, 0.06, 0.1, A, sx * 0.44, -0.22, -0.06)); // hajtómű-izzás
    }
    /* lencsés szem */
    const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 18), P3);
    eyeRing.position.set(0, 0.02, 0.33);
    torso.add(eyeRing);
    torso.add(box(0.12, 0.12, 0.05, A, 0, 0.02, 0.34));
    /* alsó lézerágyú */
    const gun = cyl(0.04, 0.05, 0.3, P2, 0, -0.28, 0.14);
    gun.rotation.x = Math.PI / 2.6;
    torso.add(gun);
    const muz = new THREE.Group();
    muz.position.set(0, -0.34, 0.3);
    torso.add(muz);
    parts.muzzle = muz;
    /* neon gyűrű */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 8, 28), A);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.02;
    torso.add(ring);
    parts.ring = ring;
    parts.torso = torso;
    g.add(torso);
    parts.weaponType = 'ranged';
    return { g, parts, height: 1.5, floaty: true };
  }

  function buildRig(variant, colors, weapon) {
    let built;
    if (variant === 'drone') built = rigDrone(colors);
    else if (variant === 'beast') built = rigBeast(colors);
    else built = rigHumanoid(colors, variant === 'heavy' ? 'heavy' : variant === 'slim' ? 'slim' : 'normal');
    if (built.parts.kind === 'humanoid') attachWeapon(built.parts, weapon || 'katana', colors.accent);
    return built;
  }

  /* ============================================================
     BOT-KEZELÉS
  ============================================================ */
  function disposeGroup(g) {
    if (!g) return;
    g.parent && g.parent.remove(g);
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  function makeBot(side, opts) {
    const built = buildRig(opts.variant, opts.colors, opts.weapon);
    const g = built.g;
    g.rotation.y = side === 'player' ? Math.PI / 2 : -Math.PI / 2;
    const baseX = side === 'player' ? -2.1 : 2.1;
    g.position.x = baseX;
    scene.add(g);
    const phongs = [], fadeMats = [];
    g.traverse(o => {
      if (o.material) {
        fadeMats.push(o.material);
        if (o.material.emissive) phongs.push(o.material);
      }
    });
    const bot = {
      g, parts: built.parts, side, baseX,
      dir: side === 'player' ? 1 : -1,
      baseRotY: g.rotation.y,
      floaty: built.floaty,
      height: built.height,
      accent: opts.colors.accent,
      phongs, fadeMats, flash: 0,
      anim: null, dead: false, disposed: false,
      model: false, mixer: null, clips: null, current: null,
      ranged: opts.weapon === 'gun' || opts.weapon === 'staff' || opts.variant === 'drone',
      t: Math.random() * 10,
    };
    const mk = MODEL_MAP[opts.modelKey];
    if (mk) {
      loadGLTF(mk.url)
        .then(gl => applyModel(bot, gl, mk.h))
        .catch(() => {});
    }
    return bot;
  }

  function setAnim(bot, type, dur, extra) {
    if (!bot || bot.dead) return;
    bot.anim = Object.assign({ type, t0: performance.now(), dur, fx1: false, fx2: false }, extra || {});
    if (type === 'death') bot.dead = true;
  }

  function worldOf(obj) {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    return v;
  }

  /* ============================================================
     EFFEKTEK
  ============================================================ */
  function spawnSparks(pos, color, n, spread) {
    for (let i = 0; i < (n || 14); i++) {
      const m = box(0.07, 0.07, 0.07, fxMat(color), pos.x, pos.y, pos.z);
      scene.add(m);
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI;
      const sp = (spread || 2.6) * (0.4 + Math.random() * 0.6);
      effects.push({
        mesh: m, life: 0.55, life0: 0.55,
        vx: Math.sin(b) * Math.cos(a) * sp,
        vy: Math.abs(Math.cos(b)) * sp * 0.9 + 1.2,
        vz: Math.sin(b) * Math.sin(a) * sp * 0.5,
        grav: 7,
      });
    }
  }

  function spawnRing(pos, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.36, 30), fxMat(color, 0.9));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.04, pos.z);
    scene.add(m);
    effects.push({ mesh: m, life: 0.45, life0: 0.45, ring: true, ringScale: 7 });
  }

  function spawnSlash(pos, color) {
    const m = box(1.5, 0.12, 0.02, fxMat(color, 0.95), pos.x, pos.y, pos.z + 0.3);
    m.rotation.z = -0.5 - Math.random() * 0.8;
    scene.add(m);
    effects.push({ mesh: m, life: 0.16, life0: 0.16, grow: 1.6 });
  }

  function spawnTracer(from, to, color) {
    const dist = from.distanceTo(to);
    const m = box(0.05, 0.05, dist, fxMat(color, 1));
    m.position.copy(from).lerp(to, 0.5);
    m.lookAt(to);
    scene.add(m);
    effects.push({ mesh: m, life: 0.14, life0: 0.14 });
    spawnSparks(to, color, 8, 1.8);
  }

  function spawnShield(pos, color) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.85, 6), fxMat(color, 0.45));
    m.position.set(pos.x, 1.0, pos.z);
    m.rotation.y = pos.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(m);
    effects.push({ mesh: m, life: 0.7, life0: 0.7 });
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life -= dt;
      const k = clamp01(e.life / e.life0);
      if (e.life <= 0) {
        scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        effects.splice(i, 1);
        continue;
      }
      if (e.vx !== undefined) {
        e.mesh.position.x += e.vx * dt;
        e.mesh.position.y += e.vy * dt;
        e.mesh.position.z += e.vz * dt;
        e.vy -= e.grav * dt;
        e.mesh.scale.setScalar(Math.max(0.05, k));
      }
      if (e.ring) e.mesh.scale.setScalar(1 + (1 - k) * e.ringScale);
      if (e.grow) e.mesh.scale.x = 1 + (1 - k) * e.grow;
      e.mesh.material.opacity = k;
    }
  }

  /* ============================================================
     PÓZOK
  ============================================================ */
  const POSE_KEYS = ['legL', 'legR', 'shinL', 'shinR', 'armL', 'armR', 'foreL', 'foreR',
    'head', 'torso', 'legFL', 'legFR', 'legBL', 'legBR', 'tail', 'jaw'];

  function resetPose(b) {
    const p = b.parts;
    for (const key of POSE_KEYS) if (p[key]) p[key].rotation.set(0, 0, 0);
  }

  function poseIdle(b) {
    const p = b.parts, t = b.t;
    if (p.kind === 'humanoid') {
      p.armL.rotation.x = Math.sin(t * 1.7) * 0.06;
      p.armR.rotation.x = -Math.sin(t * 1.7) * 0.06;
      p.foreL.rotation.x = -0.16 + Math.sin(t * 1.7) * 0.04;
      p.foreR.rotation.x = -0.16 - Math.sin(t * 1.7) * 0.04;
      p.torso.rotation.y = Math.sin(t * 0.8) * 0.05;
      p.torso.rotation.x = Math.sin(t * 2.2) * 0.015;
      p.head.rotation.y = Math.sin(t * 0.5) * 0.14;
    } else if (p.kind === 'beast') {
      p.tail.rotation.y = Math.sin(t * 3.5) * 0.4;
      p.head.rotation.x = Math.sin(t * 1.2) * 0.07;
      p.jaw.rotation.x = 0.06 + Math.sin(t * 2.5) * 0.05;
    } else if (p.kind === 'drone') {
      if (p.ring) p.ring.rotation.z += 0.06;
      p.torso.rotation.z = Math.sin(t * 1.4) * 0.05;
      p.torso.rotation.y = Math.sin(t * 0.7) * 0.1;
    }
  }

  function runCycle(b, speed) {
    const p = b.parts, t = b.t * (speed || 14);
    const sw = Math.sin(t);
    if (p.kind === 'humanoid') {
      p.legL.rotation.x = sw * 0.85;
      p.shinL.rotation.x = Math.max(0, -sw) * 1.15;
      p.legR.rotation.x = -sw * 0.85;
      p.shinR.rotation.x = Math.max(0, sw) * 1.15;
      p.armL.rotation.x = -sw * 0.7;
      p.armR.rotation.x = sw * 0.7;
      p.foreL.rotation.x = -0.7;
      p.foreR.rotation.x = -0.7;
      p.torso.rotation.x = 0.2;
    } else if (p.kind === 'beast') {
      p.legFL.rotation.x = sw * 0.85;
      p.legFR.rotation.x = -sw * 0.85;
      p.legBL.rotation.x = -sw * 0.85;
      p.legBR.rotation.x = sw * 0.85;
      p.tail.rotation.y = Math.sin(t * 0.5) * 0.3;
    }
  }

  /* melee: berohanás → csapás → visszafutás; bestia ugrik+harap */
  function poseAttackMelee(b, pr, heavy, target) {
    const p = b.parts;
    const reach = 2.75;
    let ox = 0, oy = 0;
    if (pr < 0.38) {
      const k = easeInOut(pr / 0.38);
      ox = k * reach;
      runCycle(b, 16);
      if (p.kind === 'beast') oy = Math.sin(k * Math.PI) * 0.45;   // ugrás
      if (p.kind === 'humanoid' && heavy) {                        // felhúzott kar
        p.armR.rotation.x = -2.4 * k;
        p.foreR.rotation.x = -0.8 * k;
      }
    } else if (pr < 0.62) {
      ox = reach;
      const sp = (pr - 0.38) / 0.24;
      if (p.kind === 'humanoid') {
        p.torso.rotation.x = 0.28;
        p.legL.rotation.x = 0.4; p.legR.rotation.x = -0.5;
        p.shinR.rotation.x = 0.6;
        if (b.anim.dual) {
          p.armR.rotation.x = -2.3 + sp * 3.0;
          p.armL.rotation.x = -2.3 + sp * 3.0;
          p.foreR.rotation.x = -0.7 + sp * 0.6;
          p.foreL.rotation.x = -0.7 + sp * 0.6;
        } else if (heavy) {
          p.armR.rotation.x = -2.7 + sp * 3.5;
          p.foreR.rotation.x = -0.8 + sp * 0.75;
          p.armL.rotation.x = -0.5;
          p.torso.rotation.x = 0.1 + sp * 0.35;
        } else {
          p.armR.rotation.x = -2.1 + sp * 2.8;
          p.foreR.rotation.x = -0.6 + sp * 0.55;
        }
      } else if (p.kind === 'beast') {
        p.torso.rotation.x = 0.3;
        p.head.rotation.x = -0.35;
        p.jaw.rotation.x = 0.65 - sp * 0.6;    // harapás: kinyílik → összecsukódik
        p.legFL.rotation.x = -0.9;
        p.legFR.rotation.x = -0.9;
      }
      if (!b.anim.fx1 && sp > 0.45) {
        b.anim.fx1 = true;
        const tp = target ? worldOf(target.g) : new THREE.Vector3(-b.baseX, 0, 0);
        tp.y = 1.05;
        spawnSlash(tp, b.accent);
        spawnSparks(tp, b.accent, heavy ? 22 : 12, heavy ? 3.4 : 2.4);
        if (heavy) spawnRing(tp, b.accent);
      }
    } else {
      ox = (1 - easeInOut((pr - 0.62) / 0.38)) * reach;
      runCycle(b, 15);
    }
    return { ox: ox * b.dir, oy };
  }

  /* lövés: célzás → tűz → visszarúgás (humanoid gun + drón lézer) */
  function poseAttackRanged(b, pr, heavy, target) {
    const p = b.parts;
    if (p.kind === 'humanoid') {
      p.armR.rotation.x = -1.5;
      p.foreR.rotation.x = -0.06;
      p.armL.rotation.x = -0.5;
      p.foreL.rotation.x = -0.9;
      p.torso.rotation.y = -0.14 * b.dir;
      p.head.rotation.y = 0.1 * b.dir;
      if (pr > 0.3 && pr < 0.5) p.torso.rotation.x = -0.12;
    } else if (p.kind === 'drone') {
      p.torso.rotation.x = 0.18;
      if (pr > 0.3 && pr < 0.5) p.torso.rotation.x = -0.1;
    }
    if (pr > 0.3 && !b.anim.fx1) {
      b.anim.fx1 = true;
      const from = p.muzzle ? worldOf(p.muzzle) : worldOf(b.g).setY(1.1);
      const tp = target ? worldOf(target.g) : new THREE.Vector3(-b.baseX, 0, 0);
      tp.y = 1.05;
      spawnTracer(from, tp, b.accent);
      spawnSparks(from, b.accent, 5, 1.2);   // torkolattűz
      if (heavy) { spawnRing(tp, b.accent); spawnSparks(tp, b.accent, 20, 3.2); }
      camPunch = 0.25;
    }
    return { ox: 0, oy: 0 };
  }

  function poseHit(b, pr) {
    const p = b.parts;
    const k = Math.sin(pr * Math.PI);
    if (p.torso) p.torso.rotation.x = -0.42 * k;
    if (p.head) p.head.rotation.x = -0.32 * k;
    if (p.kind === 'humanoid') {
      p.armL.rotation.x = 0.5 * k;
      p.armR.rotation.x = 0.5 * k;
    }
    return { ox: -k * 0.55 * b.dir, oy: 0 };
  }

  function poseGuard(b, pr) {
    const p = b.parts;
    const k = pr < 0.15 ? pr / 0.15 : pr > 0.85 ? (1 - pr) / 0.15 : 1;
    if (p.kind === 'humanoid') {
      p.armL.rotation.x = -1.25 * k;
      p.armR.rotation.x = -1.25 * k;
      p.foreL.rotation.x = -1.1 * k;
      p.foreR.rotation.x = -1.1 * k;
      p.armL.rotation.z = 0.4 * k;
      p.armR.rotation.z = -0.4 * k;
      p.torso.rotation.x = 0.12 * k;
    } else if (p.kind === 'beast') {
      p.torso.rotation.x = -0.22 * k;
      p.head.rotation.x = 0.2 * k;
    }
    if (!b.anim.fx1 && pr > 0.1) {
      b.anim.fx1 = true;
      spawnShield(worldOf(b.g), b.accent);
    }
    return { ox: 0, oy: 0 };
  }

  function poseStun(b, pr) {
    const p = b.parts;
    if (p.torso) p.torso.rotation.z = Math.sin(pr * Math.PI * 6) * 0.3;
    if (p.head) p.head.rotation.z = Math.sin(pr * Math.PI * 6 + 1) * 0.35;
    if (!b.anim.fx1 || (pr > 0.5 && !b.anim.fx2)) {
      if (!b.anim.fx1) b.anim.fx1 = true; else b.anim.fx2 = true;
      const pos = worldOf(b.g);
      pos.y = b.height;
      spawnSparks(pos, 0xa06bd6, 10, 1.6);
    }
    return { ox: 0, oy: 0 };
  }

  function poseDeath(b, pr) {
    const p = b.parts;
    let oy = 0;
    if (pr < 0.25) {
      const k = pr / 0.25;
      if (p.torso) p.torso.rotation.x = -0.32 * k;
    } else {
      const k = easeInOut((pr - 0.25) / 0.75);
      b.g.rotation.z = -k * (Math.PI / 2) * 0.92 * b.dir;
      oy = -k * 0.1;
      if (pr > 0.5) {
        const fade = 1 - (pr - 0.5) / 0.5;
        for (const m of b.fadeMats) {
          m.transparent = true;
          m.opacity = fade;
        }
      }
      if (!b.anim.fx2 && pr > 0.35) {
        b.anim.fx2 = true;
        const pos = worldOf(b.g);
        pos.y = 0.6;
        spawnSparks(pos, b.accent, 26, 3.2);
        spawnRing(pos, b.accent);
      }
    }
    return { ox: 0, oy };
  }

  function poseVictory(b, pr) {
    const p = b.parts;
    const hop = Math.abs(Math.sin(pr * Math.PI * 3)) * 0.22;
    if (p.kind === 'humanoid') {
      p.armR.rotation.x = -2.75;
      p.foreR.rotation.x = -0.15;
      p.armL.rotation.x = Math.sin(pr * Math.PI * 6) * 0.3;
    } else if (p.kind === 'beast') {
      p.torso.rotation.x = -0.4;
      p.legFL.rotation.x = -1.2;
      p.legFR.rotation.x = -1.2;
      p.jaw.rotation.x = 0.4;
    }
    return { ox: 0, oy: hop };
  }

  /* ============================================================
     FŐ HUROK
  ============================================================ */
  function loop(now) {
    requestAnimationFrame(loop);
    if (!renderer) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (!running || !stage.offsetParent) return;

    const other = { player: bots.enemy, enemy: bots.player };

    for (const side of ['player', 'enemy']) {
      const b = bots[side];
      if (!b) continue;
      b.t += dt;
      let ox = 0, oy = 0;

      if (b.model) {
        /* ---- GLB modell: a klipek animálnak, itt csak mozgás + effekt ---- */
        b.mixer.update(dt);
        if (b.anim) {
          const pr = clamp01((now - b.anim.t0) / b.anim.dur);
          const type = b.anim.type;
          if (type === 'attack') {
            if (b.anim.ranged) {
              if (pr > 0.35 && !b.anim.fx1) {
                b.anim.fx1 = true;
                const from = worldOf(b.g);
                from.y = 1.15;
                from.x += 0.5 * b.dir;
                const target = other[side];
                const tp = target ? worldOf(target.g) : new THREE.Vector3(-b.baseX, 0, 0);
                tp.y = 1.05;
                spawnTracer(from, tp, b.accent);
                if (b.anim.heavy) { spawnRing(tp, b.accent); spawnSparks(tp, b.accent, 20, 3.2); }
                camPunch = 0.25;
              }
            } else {
              const reach = 2.75;
              if (pr < 0.38) ox = easeInOut(pr / 0.38) * reach * b.dir;
              else if (pr < 0.62) {
                ox = reach * b.dir;
                const sp = (pr - 0.38) / 0.24;
                if (!b.anim.fx1 && sp > 0.45) {
                  b.anim.fx1 = true;
                  const target = other[side];
                  const tp = target ? worldOf(target.g) : new THREE.Vector3(-b.baseX, 0, 0);
                  tp.y = 1.05;
                  spawnSlash(tp, b.accent);
                  spawnSparks(tp, b.accent, b.anim.heavy ? 22 : 12, b.anim.heavy ? 3.4 : 2.4);
                  if (b.anim.heavy) spawnRing(tp, b.accent);
                }
              } else ox = (1 - easeInOut((pr - 0.62) / 0.38)) * reach * b.dir;
            }
          } else if (type === 'hit') {
            ox = -Math.sin(pr * Math.PI) * 0.5 * b.dir;
          } else if (type === 'death') {
            if (pr > 0.55) {
              const fade = 1 - (pr - 0.55) / 0.45;
              for (const m of b.fadeMats) { m.transparent = true; m.opacity = fade; }
            }
            if (!b.anim.fx2 && pr > 0.4) {
              b.anim.fx2 = true;
              const pos = worldOf(b.g);
              pos.y = 0.6;
              spawnSparks(pos, b.accent, 26, 3.2);
              spawnRing(pos, b.accent);
            }
          }
          if (pr >= 1 && type !== 'death') b.anim = null;
        }
      } else {
        /* ---- procedurális váz (fallback, amíg a modell tölt) ---- */
        if (!b.dead || !b.anim) resetPose(b);
        if (!b.anim) poseIdle(b);

        oy += Math.sin(b.t * 2.2) * (b.floaty ? 0.09 : 0.02) + (b.floaty ? 0.1 : 0);

        if (b.anim) {
          const pr = clamp01((now - b.anim.t0) / b.anim.dur);
          const type = b.anim.type;
          let ret = null;
          if (type === 'attack') {
            resetPose(b);
            ret = (b.parts.weaponType === 'ranged')
              ? poseAttackRanged(b, pr, b.anim.heavy, other[side])
              : poseAttackMelee(b, pr, b.anim.heavy, other[side]);
          } else if (type === 'hit') { resetPose(b); ret = poseHit(b, pr); }
          else if (type === 'guard') { resetPose(b); ret = poseGuard(b, pr); }
          else if (type === 'stun') { resetPose(b); ret = poseStun(b, pr); }
          else if (type === 'death') { ret = poseDeath(b, pr); }
          else if (type === 'victory') { resetPose(b); ret = poseVictory(b, pr); }
          if (ret) { ox = ret.ox; oy += ret.oy; }
          if (pr >= 1 && type !== 'death') {
            b.anim = null;
            b.g.rotation.y = b.baseRotY;
            b.g.rotation.z = 0;
          }
        }
      }

      b.g.position.x = b.baseX + ox;
      b.g.position.y = oy;

      if (b.flash > 0) {
        b.flash -= dt;
        const on = b.flash > 0 && Math.floor(b.flash * 22) % 2 === 0;
        for (const m of b.phongs) m.emissive.setHex(on ? 0xff3344 : 0x000000);
        if (b.flash <= 0) for (const m of b.phongs) m.emissive.setHex(0x000000);
      }
    }

    updateEffects(dt);

    let cz = 6.4;
    if (camPunch > 0) { camPunch -= dt; cz -= Math.sin(clamp01(camPunch / 0.25) * Math.PI) * 0.35; }
    if (camShake > 0) {
      camShake -= dt;
      camera.position.x = (Math.random() - 0.5) * 0.18 * Math.max(0, camShake * 3);
      camera.position.y = 2.4 + (Math.random() - 0.5) * 0.12 * Math.max(0, camShake * 3);
    } else {
      camera.position.x = 0;
      camera.position.y = 2.4;
    }
    camera.position.z = cz;
    camera.lookAt(0, 1.0, 0);

    renderer.render(scene, camera);
  }

  /* ============================================================
     KARAKTER-ELŐNÉZET (karakterlap, forgó modell)
  ============================================================ */
  let pv = null;
  function pvLoop() {
    if (!pv) return;
    requestAnimationFrame(pvLoop);
    if (!pv.el.offsetParent) return;
    if (pv.group) pv.group.rotation.y += 0.011;
    if (pv.mixer) pv.mixer.update(0.016);
    pv.renderer.render(pv.scene, pv.camera);
  }

  function mountPreview(elId, skinId) {
    if (!threeOk()) return false;
    const el = document.getElementById(elId);
    if (!el) return false;
    if (!pv) {
      pv = {};
      pv.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      pv.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      pv.scene = new THREE.Scene();
      pv.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
      pv.camera.position.set(0, 1.55, 3.6);
      pv.camera.lookAt(0, 0.95, 0);
      pv.scene.add(new THREE.AmbientLight(0xb09a7a, 0.8));
      const key = new THREE.DirectionalLight(0xffffff, 0.62);
      key.position.set(2, 5, 4);
      pv.scene.add(key);
      const rim = new THREE.PointLight(0xffb85c, 1.2, 10);
      rim.position.set(-2, 2, 2);
      pv.scene.add(rim);
      const pad = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.82, 36), fxMat(0xffd24d, 0.5));
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.02;
      pv.scene.add(pad);
      pv.group = null;
      pv.el = el;
      el.innerHTML = '';
      el.appendChild(pv.renderer.domElement);
      requestAnimationFrame(pvLoop);
    } else if (pv.el !== el) {
      el.innerHTML = '';
      el.appendChild(pv.renderer.domElement);
      pv.el = el;
    }
    const size = Math.min(el.clientWidth || 170, 220);
    pv.renderer.setSize(size, size, false);
    pv.renderer.domElement.style.width = '100%';
    pv.renderer.domElement.style.height = '100%';
    setPreviewSkin(skinId);
    return true;
  }

  function setPreviewSkin(skinId) {
    if (!pv) return;
    const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
    pv.skinId = skin.id;
    pv.mixer = null;
    if (pv.group) disposeGroup(pv.group);
    const built = buildRig(skin.build === 'heavy' ? 'heavy' : skin.build === 'slim' ? 'slim' : 'humanoid',
      { body: skin.body, accent: skin.accent, crest: skin.crest }, skin.weapon);
    pv.group = built.g;
    pv.scene.add(pv.group);
    const mk = MODEL_MAP[skin.id];
    if (mk) {
      loadGLTF(mk.url).then(gl => {
        if (!pv || pv.skinId !== skin.id || !THREE.SkeletonUtils) return;
        const clone = THREE.SkeletonUtils.clone(gl.scene);
        const bbox = new THREE.Box3().setFromObject(clone);
        clone.scale.setScalar(mk.h / Math.max(0.01, bbox.max.y - bbox.min.y));
        if (pv.group) disposeGroup(pv.group);
        const grp = new THREE.Group();
        grp.add(clone);
        pv.group = grp;
        pv.scene.add(grp);
        pv.mixer = new THREE.AnimationMixer(clone);
        const idle = findClip(gl.animations, 'idle');
        if (idle) pv.mixer.clipAction(idle).play();
      }).catch(() => {});
    }
  }

  /* ============================================================
     PUBLIKUS API
  ============================================================ */
  return {
    SKINS,
    variantFor(emoji) {
      if ('🧙🔮☠️👻🧪'.includes(emoji)) return 'drone';   /* → Skeleton_Mage */
      if ('🐀🐺🐍🐕🕷️🐉'.includes(emoji)) return 'beast'; /* → Skeleton_Minion */
      if ('👑⚔️🛡️👹💪'.includes(emoji)) return 'heavy';  /* → Skeleton_Warrior */
      return 'humanoid';                                   /* → Skeleton_Rogue */
    },
    start(opts) {
      const st = document.getElementById('battleStage');
      if (!init()) { if (st) st.style.display = 'none'; return; }
      st.style.display = 'block';
      const accent = LOC_ACCENT[(opts && opts.locId) || 'pvp'] || 0xff2d78;
      lightR.color.setHex(accent);
      grid.material.color = new THREE.Color(accent);
      for (const capM of backdropCaps) capM.color.setHex(accent);
      if (padE) padE.material.color.setHex(accent);

      if (bots.player) { bots.player.disposed = true; disposeGroup(bots.player.g); }
      if (bots.enemy) { bots.enemy.disposed = true; disposeGroup(bots.enemy.g); }
      for (const e of effects) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); }
      effects = [];

      const skin = SKINS.find(s => s.id === (opts && opts.skin)) || SKINS[0];
      bots.player = makeBot('player', {
        variant: skin.build === 'heavy' ? 'heavy' : skin.build === 'slim' ? 'slim' : 'humanoid',
        colors: { body: skin.body, accent: skin.accent, crest: skin.crest },
        weapon: skin.weapon,
        modelKey: skin.id,
      });
      const enemySkin = opts && opts.enemySkin ? SKINS.find(s => s.id === opts.enemySkin) : null;
      if (enemySkin) {
        /* online PvP: az ellenfél a saját hős-modelljével áll ki */
        bots.enemy = makeBot('enemy', {
          variant: enemySkin.build === 'heavy' ? 'heavy' : enemySkin.build === 'slim' ? 'slim' : 'humanoid',
          colors: { body: enemySkin.body, accent: enemySkin.accent, crest: enemySkin.crest },
          weapon: enemySkin.weapon,
          modelKey: enemySkin.id,
        });
      } else {
        const eVariant = (opts && opts.variant) || 'humanoid';
        bots.enemy = makeBot('enemy', {
          variant: eVariant,
          colors: {
            body: eVariant === 'beast' ? 0x332c3c : eVariant === 'drone' ? 0x262c48 : 0x3c2542,
            accent,
          },
          weapon: eVariant === 'heavy' ? 'fists' : 'katana',
          modelKey: eVariant,
        });
      }
      if (opts && opts.enemyScale && opts.enemyScale !== 1) {
        bots.enemy.g.scale.multiplyScalar(opts.enemyScale);
      }
      running = true;
      resize();
    },
    attack(side, heavy) {
      const b = bots[side];
      if (!b) return;
      if (b.model) {
        setAnim(b, 'attack', b.ranged ? 720 : heavy ? 920 : 740, { heavy: !!heavy, ranged: b.ranged });
        playClip(b, b.ranged ? 'shoot' : heavy ? 'heavy' : 'attack', true);
        return;
      }
      const dual = b.parts.kind === 'humanoid' && b.parts.foreL && b.parts.foreL.children.length > 1;
      setAnim(b, 'attack', b.parts.weaponType === 'ranged' ? 620 : heavy ? 840 : 660, { heavy: !!heavy, dual });
    },
    hit(side) {
      const b = bots[side];
      if (!b || b.dead) return;
      setTimeout(() => {
        if (!b || b.dead) return;
        setAnim(b, 'hit', 400);
        if (b.model) playClip(b, 'hit', true);
        b.flash = 0.35;
        camShake = 0.4;
        const pos = worldOf(b.g);
        pos.y = b.height * 0.65;
        spawnSparks(pos, 0xff5544, 10, 2.2);
      }, 230);
    },
    guard(side) {
      const b = bots[side];
      if (!b) return;
      setAnim(b, 'guard', 900);
      if (b.model) {
        playClip(b, 'block', true);
        spawnShield(worldOf(b.g), b.accent);
      }
    },
    stun(side) {
      const b = bots[side];
      if (!b) return;
      setAnim(b, 'stun', 1000);
      if (b.model) {
        playClip(b, 'stun', true);
        const pos = worldOf(b.g);
        pos.y = b.height;
        spawnSparks(pos, 0xa06bd6, 12, 1.8);
      }
    },
    death(side) {
      const b = bots[side];
      if (!b) return;
      setTimeout(() => {
        setAnim(b, 'death', 1400);
        if (b.model) playClip(b, 'death', true);
        camShake = 0.55;
        const winner = bots[side === 'player' ? 'enemy' : 'player'];
        if (winner && !winner.dead) {
          setTimeout(() => {
            setAnim(winner, 'victory', 1600);
            if (winner.model) playClip(winner, 'victory', true);
          }, 500);
        }
      }, 300);
    },
    stop() { running = false; },
    clipsOf(side) {
      const b = bots[side];
      return b && b.clips ? b.clips.map(c => c.name) : null;
    },
    mountPreview, setPreviewSkin,
  };
})();

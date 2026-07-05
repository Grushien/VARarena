'use strict';
/* ============================================================
   VASVÁR ARÉNA — 3D város (Three.js) v2
   Igazi CC0 épület-modellek (Quaternius, models/city/) + a hősöd.
   Ha nincs Three.js/loader, a régi CSS-város marad láthatóan.
============================================================ */
window.City3D = (function () {
  let renderer, scene, camera, stage, labelLayer;
  let running = false, lastT = 0, azim = 2.3, azTarget = 2.3;
  let dragging = false, dragX = 0, moved = 0;
  let raycaster, pointer = { x: -2, y: -2 };
  let torchLights = [], embers = [], flames = [], banners = [];
  let clickables = [], labels = [], hovered = null;
  let hero = null, heroMixer = null;

  const HERO_MODEL = { ronin: 'models/Knight.glb', bruiser: 'models/Barbarian.glb', netrunner: 'models/Mage.glb', zsoldos: 'models/Rogue_Hooded.glb' };

  /* fő (kattintható) épületek */
  const BUILDINGS = [
    { screen: 'arena',    label: 'ARÉNA',     sub: '⚔ harc és dicsőség', color: 0xd8442e, file: 'models/city/castle.glb',      h: 5.2, x: -6.5, z: -5.0 },
    { screen: 'shop',     label: 'PIACTÉR',   sub: '💰 vásár',           color: 0xffd24d, file: 'models/city/fantasy_inn.glb',  h: 3.6, x:  6.8, z: -4.6 },
    { screen: 'training', label: 'ISPOTÁLY',  sub: '🧪 gyógyír',         color: 0x7dc95e, file: 'models/city/fantasy_house.glb',h: 3.2, x: -7.2, z:  4.6 },
    { screen: 'ranking',  label: 'RANGLISTA', sub: '🏆 a nagy torony',   color: 0xa06bd6, file: 'models/city/tower_house.glb',  h: 5.6, x:  6.8, z:  5.0 },
  ];

  /* díszlet (nem kattintható) */
  const DECOR = [
    { file: 'models/city/blacksmith.glb',   h: 3.0, x: -11.5, z: -0.5, r: 1.2 },
    { file: 'models/city/stable.glb',       h: 2.6, x:  11.5, z: -1.0, r: -1.2 },
    { file: 'models/city/market_stand.glb', h: 1.7, x:  3.6,  z: -7.0, r: 0.2 },
    { file: 'models/city/market_stand.glb', h: 1.7, x:  7.6,  z: -7.2, r: -0.3 },
    { file: 'models/city/cart.glb',         h: 1.3, x:  2.8,  z:  6.6, r: 2.4 },
    { file: 'models/city/cart.glb',         h: 1.3, x: -3.0,  z: -6.8, r: 0.6 },
    { file: 'models/city/barrel.glb',       h: 0.8, x:  5.4,  z: -6.2, r: 0 },
    { file: 'models/city/barrel.glb',       h: 0.8, x:  6.0,  z: -6.0, r: 0.5 },
    { file: 'models/city/barrel.glb',       h: 0.8, x: -10.2, z:  1.2, r: 0 },
    { file: 'models/city/watch_tower.glb',  h: 4.2, x: -3.4,  z: -12.5, r: 0 },
    { file: 'models/city/watch_tower.glb',  h: 4.2, x:  3.4,  z: -12.5, r: 0 },
  ];
  const FENCES = [[-9, 8, 0], [-6.5, 8.3, 0], [9, 8, 0], [6.5, 8.3, 0], [-9.5, -8, 0.4], [9.5, -8, -0.4]];

  function threeOk() { return typeof THREE !== 'undefined' && !!THREE.GLTFLoader; }
  function mat(c, s) { return new THREE.MeshPhongMaterial({ color: c, shininess: s || 8, flatShading: true }); }
  function glow(c) { return new THREE.MeshBasicMaterial({ color: c }); }
  function box(w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); return o; }
  function cyl(rt, rb, h, seg, m, x, y, z) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x || 0, y || 0, z || 0); return o; }
  function cone(r, h, seg, m, x, y, z) { const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m); o.position.set(x || 0, y || 0, z || 0); return o; }

  const C = { stone: 0x8a8172, stoneD: 0x6e6658, wood: 0x6b4a2c, woodD: 0x4a3320, roofB: 0x3a4a6e, dirt: 0x3f3526 };

  /* ---- GLB betöltő + cache ---- */
  const gltfCache = {};
  function loadModel(url) {
    if (!gltfCache[url]) gltfCache[url] = new Promise((res, rej) => new THREE.GLTFLoader().load(url, res, undefined, rej));
    return gltfCache[url];
  }
  function placeModel(def, onReady) {
    loadModel(def.file).then(gltf => {
      if (!running) return;
      const obj = gltf.scene.clone(true);
      obj.scale.setScalar(1);
      obj.updateMatrixWorld(true);
      let bb = new THREE.Box3().setFromObject(obj);
      const sy = def.h / Math.max(0.001, bb.max.y - bb.min.y);
      obj.scale.setScalar(sy);
      obj.rotation.y = def.r || 0;
      obj.position.set(def.x, 0, def.z);
      obj.updateMatrixWorld(true);
      bb = new THREE.Box3().setFromObject(obj);
      obj.position.y = -bb.min.y;
      obj.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
      scene.add(obj);
      if (onReady) onReady(obj);
    }, () => {});
  }

  /* ---- fáklya ---- */
  function torch(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(cyl(0.05, 0.06, 1.1, 6, mat(C.woodD), 0, 0.55, 0));
    const flame = cone(0.14, 0.4, 6, glow(0xff9a3c), 0, 1.25, 0);
    g.add(flame); flames.push(flame);
    const L = new THREE.PointLight(0xff8a3c, 1.0, 8, 2);
    L.position.set(0, 1.3, 0); g.add(L); torchLights.push(L);
    scene.add(g);
  }
  function bannerPole(x, y, z, color, h) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(box(0.06, h, 0.06, mat(C.woodD)));
    const cloth = box(0.5, 0.66, 0.04, mat(color), 0.28, h / 2 - 0.1, 0);
    g.add(cloth); banners.push({ cloth, t: Math.random() * 6 }); scene.add(g);
  }
  function treeCone(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(cyl(0.1, 0.15, 0.9, 6, mat(C.woodD), 0, 0.45, 0));
    g.add(cone(0.6, 1.0, 7, mat(0x3c5a34), 0, 1.3, 0));
    g.add(cone(0.46, 0.8, 7, mat(0x466b3c), 0, 1.75, 0));
    scene.add(g);
  }

  function buildEnvironment() {
    scene.add(box(46, 0.4, 46, mat(C.dirt), 0, -0.2, 0));
    scene.add(cyl(8, 8.4, 0.4, 40, mat(0x544c3d), 0, -0.02, 0));         // főtér
    for (let r = 2.4; r <= 7.4; r += 1.5) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 4, 44), mat(C.stoneD));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; scene.add(ring);
    }
    scene.add(cyl(1.6, 1.8, 0.35, 16, mat(C.stone), 0, 0.17, 0));         // emelvény
    scene.add(cyl(1.4, 1.5, 0.16, 16, mat(0x3a5a7a), 0, 0.36, 0));        // víz
    // hátsó várfal + kapu
    const wallM = mat(C.stoneD);
    for (let i = -5; i <= 5; i++) {
      if (Math.abs(i) <= 1) continue;
      scene.add(box(1.6, 2.6, 0.6, wallM, i * 1.6, 1.3, -12));
      scene.add(box(0.42, 0.42, 0.7, wallM, i * 1.6 - 0.4, 2.75, -12));
      scene.add(box(0.42, 0.42, 0.7, wallM, i * 1.6 + 0.4, 2.75, -12));
    }
    scene.add(box(2.6, 2.1, 0.5, mat(C.woodD), 0, 1.05, -12));            // kapu
    treeCone(-10, 6.5); treeCone(10.5, 6.8); treeCone(-11.5, 3.5); treeCone(11.6, 3.8); treeCone(-9.5, -5); treeCone(9.8, -5);
    // fáklyák a főtér és a kapu mentén
    torch(-4.6, -11.2); torch(4.6, -11.2);
    const tR = 7.2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; torch(Math.cos(a) * tR, Math.sin(a) * tR); }
    // parázs
    const eg = new THREE.BoxGeometry(0.05, 0.05, 0.05), em = glow(0xff8a3c);
    for (let i = 0; i < 46; i++) {
      const m = new THREE.Mesh(eg, em);
      m.position.set((Math.random() - 0.5) * 26, Math.random() * 9, (Math.random() - 0.5) * 26);
      scene.add(m); embers.push({ m, sp: 0.3 + Math.random() * 0.5, sw: Math.random() * 6 });
    }
  }

  function placeBuildings() {
    for (const def of BUILDINGS) {
      def.r = Math.atan2(-def.x, -def.z);   // középre néz
      placeModel(def, obj => {
        obj.userData = { screen: def.screen, baseY: obj.position.y, hoverT: 0 };
        clickables.push(obj);
      });
      torch(def.x - 1.6, def.z + 2.2); torch(def.x + 1.6, def.z + 2.2);
      bannerPole(def.x, 0, def.z + 2.6, def.color, 2.0);
      const el = document.createElement('div');
      el.className = 'city3d-label';
      el.innerHTML = `<b style="color:#${def.color.toString(16).padStart(6, '0')}">${def.label}</b><small>${def.sub}</small>`;
      el.onclick = () => window.switchScreen && switchScreen(def.screen);
      labelLayer.appendChild(el);
      labels.push({ el, anchor: new THREE.Vector3(def.x, def.h + 1.0, def.z), screen: def.screen });
    }
    for (const d of DECOR) placeModel(d);
    for (const [x, z, r] of FENCES) placeModel({ file: 'models/city/fence.glb', h: 0.8, x, z, r });
  }

  function placeHero(skinId) {
    if (hero) { scene.remove(hero); hero = null; heroMixer = null; }
    loadModel(HERO_MODEL[skinId] || HERO_MODEL.ronin).then(gltf => {
      if (!running) return;
      const model = (THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true));
      const bb = new THREE.Box3().setFromObject(model);
      model.scale.setScalar(2.5 / Math.max(0.01, bb.max.y - bb.min.y));
      model.position.set(0, 0.52, 0);
      model.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      scene.add(model); hero = model;
      if (gltf.animations && gltf.animations.length) {
        heroMixer = new THREE.AnimationMixer(model);
        const idle = gltf.animations.find(a => /idle/i.test(a.name)) || gltf.animations[0];
        heroMixer.clipAction(idle).play();
      }
    }, () => {});
  }

  function init() {
    if (renderer) return true;
    if (!threeOk()) return false;
    stage = document.getElementById('cityStage');
    if (!stage) return false;
    labelLayer = document.getElementById('cityLabels');

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; }
    stage.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1024, 18, 46);
    camera = new THREE.PerspectiveCamera(46, 2, 0.1, 90);

    scene.add(new THREE.AmbientLight(0x8a7a94, 0.85));
    const moon = new THREE.DirectionalLight(0xaeb8e0, 0.85); moon.position.set(-8, 16, 6); scene.add(moon);
    scene.add(new THREE.HemisphereLight(0xffc27a, 0x2a1c14, 0.7));
    const fill = new THREE.DirectionalLight(0xff9a5a, 0.35); fill.position.set(6, 6, -6); scene.add(fill);

    buildEnvironment();
    placeBuildings();
    placeHero((window.state && state.skin) || 'ronin');

    raycaster = new THREE.Raycaster();
    stage.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; moved = 0; });
    window.addEventListener('pointerup', () => setTimeout(() => { dragging = false; }, 0));
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (dragging) { const dx = e.clientX - dragX; moved += Math.abs(dx); azTarget -= dx * 0.006; dragX = e.clientX; }
    });
    stage.addEventListener('click', () => {
      if (moved > 6) return;
      if (hovered && hovered.userData.screen && window.switchScreen) switchScreen(hovered.userData.screen);
    });
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(loop);
    return true;
  }

  function resize() {
    if (!renderer || !stage) return;
    const w = stage.clientWidth || 700, h = stage.clientHeight || 380;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (!renderer) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (!running || !stage.offsetParent) return;

    if (!dragging) azTarget += dt * 0.05;
    azim += (azTarget - azim) * 0.08;
    const rad = 16.5;
    camera.position.set(Math.sin(azim) * rad, 9.5, Math.cos(azim) * rad);
    camera.lookAt(0, 1.8, 0);

    for (const L of torchLights) L.intensity = 0.85 + Math.sin(now * 0.012 + L.position.x) * 0.25 + Math.random() * 0.1;
    for (const f of flames) { f.scale.y = 1 + Math.sin(now * 0.02 + f.position.x) * 0.2; f.scale.x = 1 + Math.cos(now * 0.017) * 0.12; }
    for (const b of banners) { b.t += dt; b.cloth.rotation.y = Math.sin(b.t * 1.6) * 0.25; }
    for (const e of embers) { e.m.position.y += e.sp * dt; e.m.position.x += Math.sin(now * 0.001 + e.sw) * dt * 0.3; if (e.m.position.y > 9) e.m.position.y = 0; }
    if (heroMixer) heroMixer.update(dt);
    if (hero) hero.rotation.y = -azim + Math.PI;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickables, true);
    let top = null;
    if (hits.length) { let o = hits[0].object; while (o.parent && !o.userData.screen) o = o.parent; if (o.userData.screen) top = o; }
    if (top !== hovered) { if (hovered) hovered.userData.hoverT = 0; hovered = top; stage.style.cursor = top ? 'pointer' : 'grab'; }
    for (const c of clickables) {
      const target = c === hovered ? 1 : 0;
      c.userData.hoverT += (target - c.userData.hoverT) * 0.2;
      c.position.y = c.userData.baseY + c.userData.hoverT * 0.3;
    }
    for (const lb of labels) {
      const v = lb.anchor.clone().project(camera);
      const vis = v.z < 1;
      lb.el.style.display = vis ? 'block' : 'none';
      if (vis) {
        lb.el.style.left = ((v.x * 0.5 + 0.5) * 100) + '%';
        lb.el.style.top = ((-v.y * 0.5 + 0.5) * 100) + '%';
        lb.el.classList.toggle('hot', hovered && hovered.userData.screen === lb.screen);
      }
    }
    renderer.render(scene, camera);
  }

  return {
    start() {
      const st = document.getElementById('cityStage');
      const css = document.getElementById('city3d');
      if (!init()) { if (css) css.style.display = 'block'; return; }
      if (css) css.style.display = 'none';
      st.style.display = 'block';
      if (labelLayer) labelLayer.style.display = 'block';
      running = true; resize();
    },
    stop() { running = false; },
    refreshHero() { if (running) placeHero((window.state && state.skin) || 'ronin'); },
  };
})();

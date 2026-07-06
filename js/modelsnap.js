'use strict';
/* ============================================================
   VASVÁR ARÉNA — ModelSnap
   Rejtett WebGL rendererrel PNG előnézeti képet készít GLB
   modellekről (cache-elve), így minden oldalon 3D-s képek
   jelenhetnek meg egyetlen extra canvas nélkül.
   Használat: <img data-snap="models/items/sword.glb" data-yaw="0.6">
   majd ModelSnap.fill()
============================================================ */
window.ModelSnap = (function () {
  let renderer = null, scene, camera;
  const cache = {};      // url|yaw -> Promise<dataURL>
  const loaders = {};    // url -> Promise<gltf>
  let chain = Promise.resolve();   // a render-lépések sorbaállítása

  function ok() { return typeof THREE !== 'undefined' && !!THREE.GLTFLoader; }

  function init() {
    if (renderer) return true;
    if (!ok()) return false;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(256, 256);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
    scene.add(new THREE.AmbientLight(0xbfb49a, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.PointLight(0xffb060, 0.8, 40);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    return true;
  }

  function load(url) {
    if (!loaders[url]) {
      const loader = new THREE.GLTFLoader();
      if (window.MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
      loaders[url] = new Promise((res, rej) => loader.load(url, res, undefined, rej));
    }
    return loaders[url];
  }

  function snap(url, opts) {
    opts = opts || {};
    const yaw = opts.yaw !== undefined ? opts.yaw : 0.6;
    const key = url + '|' + yaw;
    if (cache[key]) return cache[key];
    cache[key] = new Promise((resolve, reject) => {
      chain = chain.then(async () => {
        try {
          if (!init()) throw new Error('nincs Three.js');
          const gltf = await load(url);
          const obj = gltf.scene.clone(true);
          const holder = new THREE.Group();
          holder.add(obj);
          scene.add(holder);
          obj.updateMatrixWorld(true);
          const bb = new THREE.Box3().setFromObject(obj);
          const size = bb.getSize(new THREE.Vector3());
          const center = bb.getCenter(new THREE.Vector3());
          obj.position.sub(center);
          holder.rotation.y = yaw;
          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          camera.position.set(0, maxDim * 0.22, maxDim * (opts.zoom || 2.0));
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
          const data = renderer.domElement.toDataURL('image/png');
          scene.remove(holder);
          resolve(data);
        } catch (e) { reject(e); }
      });
    });
    return cache[key];
  }

  function fill(root) {
    const imgs = (root || document).querySelectorAll('img[data-snap]');
    for (const img of imgs) {
      const url = img.getAttribute('data-snap');
      const yaw = parseFloat(img.getAttribute('data-yaw') || '0.6');
      img.removeAttribute('data-snap');
      snap(url, { yaw }).then(d => { img.src = d; img.classList.add('loaded'); }).catch(() => {});
    }
  }

  return { snap, fill };
})();

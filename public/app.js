import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const status = $('status');
const stage = $('viewport');
let renderer, model, controls, designTexture, aspect = 1, imageGeneration = 0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(33, 1, .01, 100);
const uniforms = {
  printMap: { value: new THREE.Texture() }, printEnabled: { value: 0 },
  printCenter: { value: new THREE.Vector2(0,.09) }, printSize: { value: new THREE.Vector2(.3,.3) },
  printAngle: { value: 0 }, printSide: { value: 1 }
};
const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .89, metalness: 0, side: THREE.DoubleSide });
// Project in model space: color and print remain independent, without changing the original UVs.
material.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = 'varying vec3 vPrintPosition; varying vec3 vPrintNormal;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPrintPosition = (modelMatrix * vec4(transformed,1.0)).xyz;\nvPrintNormal = normalize(mat3(modelMatrix) * normal);');
  shader.fragmentShader = `uniform sampler2D printMap; uniform float printEnabled; uniform vec2 printCenter; uniform vec2 printSize; uniform float printAngle; uniform float printSide; varying vec3 vPrintPosition; varying vec3 vPrintNormal;\n` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    if (printEnabled > 0.5 && abs(normalize(vPrintNormal).z) > 0.25 && vPrintPosition.z * printSide > 0.0) {
      vec2 p = vec2(vPrintPosition.x * printSide, vPrintPosition.y) - printCenter;
      float c = cos(printAngle), s = sin(printAngle);
      vec2 uvPrint = mat2(c,-s,s,c) * p / printSize + 0.5;
      if (all(greaterThanEqual(uvPrint,vec2(0.0))) && all(lessThanEqual(uvPrint,vec2(1.0)))) {
        vec4 ink = texture2D(printMap, uvPrint);
        diffuseColor.rgb = mix(diffuseColor.rgb, ink.rgb, ink.a);
      }
    }`);
};
material.customProgramCacheKey = () => 'gmockup-projection-v1';

function view(side = 'front') {
  const positions = { front:[0,0,2.7], back:[0,0,-2.7], left:[-2.7,0,0], top:[0,2.7,.01] };
  camera.position.fromArray(positions[side]); controls.target.set(0,0,0); controls.update();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === side));
}
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height); camera.aspect = width / height;
  camera.fov = width < height * .9 ? 43 : 33;
  camera.updateProjectionMatrix();
}
function updatePrint() {
  const width = +$('size').value / 100;
  uniforms.printCenter.value.set(+$('pos-x').value/100, +$('pos-y').value/100);
  uniforms.printSize.value.set(width, width/aspect);
  uniforms.printAngle.value = THREE.MathUtils.degToRad(+$('angle').value);
  uniforms.printSide.value = $('side').value === 'front' ? 1 : -1;
  $('size-value').value = `${$('size').value}%`;
  $('angle-value').value = `${$('angle').value}°`;
}
function setColor(hex) {
  material.color.set(hex); $('color').value = hex; $('hex').value = hex.toUpperCase();
  document.querySelectorAll('#swatches button').forEach(b => b.classList.toggle('selected', b.dataset.color === hex));
}
for (const [hex,name] of [['#ffffff','Blanco'],['#252b29','Carbón'],['#d8ccb7','Arena'],['#78846c','Oliva'],['#263a51','Azul noche'],['#a86e68','Terracota']]) {
  const button = document.createElement('button'); button.style.background = hex; button.title = name; button.setAttribute('aria-label',name); button.dataset.color = hex;
  button.onclick = () => setColor(hex); $('swatches').append(button);
}
setColor('#ffffff');
$('color').oninput = e => setColor(e.target.value);
for (const id of ['size','pos-x','pos-y','angle']) $(id).oninput = updatePrint;
$('side').onchange = () => { updatePrint(); view($('side').value); };
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
$('reset').onclick = () => view();

async function upload(file) {
  if (!file || !model) return;
  if (file.type !== 'image/png' || file.size > 20*1024*1024) { status.textContent = 'Selecciona un PNG de hasta 20 MB.'; status.hidden = false; return; }
  const generation = ++imageGeneration;
  const url = URL.createObjectURL(file);
  try {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    if (generation !== imageGeneration) { texture.dispose(); return; }
    const image = texture.image;
    if (image.width > renderer.capabilities.maxTextureSize || image.height > renderer.capabilities.maxTextureSize) { texture.dispose(); throw new Error('Imagen demasiado grande. Reduce sus dimensiones a 8192 píxeles o menos.'); }
    aspect = image.width/image.height;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    designTexture?.dispose(); designTexture = texture; uniforms.printMap.value = texture; uniforms.printEnabled.value = 1;
    $('thumb').src = image.src; // Keep a separate data URL for preview after revoking the blob.
    const reader = new FileReader(); reader.onload = () => { if (generation === imageGeneration) $('thumb').src = reader.result; }; reader.readAsDataURL(file);
    $('filename').textContent = file.name; $('design-info').hidden = false; $('design-controls').disabled = false;
    updatePrint(); status.hidden = true;
  } catch (error) { status.hidden = false; status.textContent = error.message || 'No se pudo abrir el PNG.'; }
  finally { URL.revokeObjectURL(url); $('upload').value = ''; }
}
$('upload').onchange = e => upload(e.target.files[0]);
for (const event of ['dragenter','dragover']) $('dropzone').addEventListener(event, e => { e.preventDefault(); $('dropzone').classList.add('drag'); });
for (const event of ['dragleave','drop']) $('dropzone').addEventListener(event, e => { e.preventDefault(); $('dropzone').classList.remove('drag'); if (event === 'drop') upload(e.dataTransfer.files[0]); });
$('remove').onclick = () => { imageGeneration++; uniforms.printEnabled.value = 0; designTexture?.dispose(); designTexture = null; uniforms.printMap.value = new THREE.Texture(); $('design-info').hidden = true; $('thumb').removeAttribute('src'); $('design-controls').disabled = true; };
$('export').onclick = () => {
  renderer.render(scene, camera);
  renderer.domElement.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'mi-polo-gmockup.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
};

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    stage.append(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1; controls.maxDistance = 5;
    controls.addEventListener('start', () => document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active')));
    scene.add(new THREE.HemisphereLight(0xffffff,0xa1ab90,2));
    const key = new THREE.DirectionalLight(0xfff8ed,3); key.position.set(-2,3,4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe3edff,2); fill.position.set(3,1,-3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff,1); rim.position.set(0,2,-4); scene.add(rim);
    const gltf = await new GLTFLoader().loadAsync('/assets/polo.glb', e => { if (e.total) status.textContent = `Cargando polo · ${Math.round(e.loaded/e.total*100)}%`; });
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
    const scale = 1 / size.y; model.scale.setScalar(scale); model.position.copy(center).multiplyScalar(-scale);
    model.traverse(mesh => { if (mesh.isMesh) mesh.material = material; }); scene.add(model); model.updateMatrixWorld(true);
    const normal = await new THREE.TextureLoader().loadAsync('/assets/tela-normal.png'); normal.anisotropy = 4; material.normalMap = normal; material.normalScale.set(.3,.3); material.needsUpdate = true;
    view(); resize(); new ResizeObserver(resize).observe(stage);
    $('export').disabled = false; $('upload').disabled = false; status.hidden = true;
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene,camera); });
    window.mockup = { scene, camera, model, material, uniforms, renderer };
  } catch (error) { console.error(error); status.hidden = false; status.textContent = 'No se pudo iniciar el visor. Comprueba que el modelo esté preparado y WebGL esté habilitado. ' + error.message; }
}
init();

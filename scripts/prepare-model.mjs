import fs from 'node:fs/promises';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { weld, simplify, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

console.log('Leyendo el OBJ original…');
const obj = new OBJLoader().parse(await fs.readFile('OBJ/OBJ.obj', 'utf8'));
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('Polo');
const mat = doc.createMaterial('Tela blanca').setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.88).setMetallicFactor(0).setDoubleSided(true);
let before = 0;
obj.traverse(mesh => {
  if (!mesh.isMesh) return;
  const g = mesh.geometry;
  const primitive = doc.createPrimitive().setMaterial(mat);
  for (const [attr, semantic] of [['position','POSITION'], ['normal','NORMAL'], ['uv','TEXCOORD_0']]) {
    const a = g.getAttribute(attr);
    if (a) primitive.setAttribute(semantic, doc.createAccessor().setType(a.itemSize === 2 ? 'VEC2' : 'VEC3').setArray(new Float32Array(a.array)).setBuffer(buffer));
  }
  before += g.getAttribute('position').count / 3;
  scene.addChild(doc.createNode(mesh.name).setMesh(doc.createMesh(mesh.name).addPrimitive(primitive)));
});
await MeshoptSimplifier.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: .22, error: .001 }), dedup(), prune());
await fs.mkdir('public/assets', { recursive: true });
await new NodeIO().write('public/assets/polo.glb', doc);
await sharp('UVMAP/UVMAP_normal_1001.png').resize({ width: 2048, height: 2048, fit: 'inside' }).png().toFile('public/assets/tela-normal.png');
let after = 0;
for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) after += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
const report = { originalTriangles: before, optimizedTriangles: after, glbBytes: (await fs.stat('public/assets/polo.glb')).size };
await fs.writeFile('public/assets/model-info.json', JSON.stringify(report, null, 2));
console.log(report);

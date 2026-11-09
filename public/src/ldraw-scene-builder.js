import { ASSEMBLY_TREE, LDRAW_COLORS } from "./assembly-tree.js";

/**
 * Named constants for LDraw parsing and geometry recursion.
 */
export const MAX_RECURSION_DEPTH = 12;
export const ASCII_ZERO_CODE = 48;
export const LDRAW_CURRENT_COLOR = 16;
export const LDRAW_EDGE_COLOR = 24;

export const DEFAULT_GHOST_OPACITY = 0.22;
export const ULTRA_GHOST_OPACITY = 0.08;

/**
 * Palette extension for internal LEGO subparts (e.g. SmartHub LED, pins, and buttons)
 * that reference standard LDraw color codes not in the primary 11-color set.
 */
export const EXTRA_LDRAW_COLORS = {
  ...LDRAW_COLORS,
  1:  { hex: 0x1E5AA8, edge: 0x333333, alpha: 1.0 },
  7:  { hex: 0x8A928D, edge: 0x333333, alpha: 1.0 },
  8:  { hex: 0x545955, edge: 0x333333, alpha: 1.0 },
  14: { hex: 0xFFD700, edge: 0x333333, alpha: 1.0 },
  47: { hex: 0xFCFCFC, edge: 0xBABABA, alpha: 0.6 },
  79: { hex: 0xFFFFFF, edge: 0xBABABA, alpha: 0.9 }
};

/**
 * Shared cache of ghost materials keyed by `${baseMaterial.uuid}:${opacity}` to avoid
 * allocating hundreds of duplicate material instances across subassembly previews.
 */
const ghostMaterialCache = new Map();

/**
 * Extracts the human-readable LDraw part description from the first comment line (0 <Desc>) of a .dat file.
 * @param {string} datText
 * @param {string} fallbackPartName
 * @returns {string}
 */
export function extractPartTitleFromDat(datText, fallbackPartName = "") {
  if (typeof datText === "string") {
    const lines = datText.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("0 ")) {
        const comment = line.slice(2).trim().replace(/^~+/, "").trim();
        if (
          comment &&
          !comment.startsWith("Name:") &&
          !comment.startsWith("Author:") &&
          !comment.startsWith("!") &&
          !comment.startsWith("BFC")
        ) {
          return comment.replace(/\s+/g, " ");
        }
      }
    }
  }
  return fallbackPartName;
}

/**
 * Creates a Blender-inspired 3D Editor floor grid on #f8f9fa background.
 * Includes minor 1-stud lines, major 5-stud lines, and X (red) / Z (blue) axis lines.
 * @param {object} THREE
 * @returns {object} THREE.Group
 */
export function createBlenderGrid(THREE) {
  const gridGroup = new THREE.Group();
  gridGroup.name = "blender_editor_grid";
  gridGroup.position.y = -8;

  const halfExtent = 600;
  const minorStep = 10; // 20 LDU * 0.5 scene scale = 10 units per stud
  const majorEvery = 5; // Every 5 studs (50 units)

  const minorVerts = [];
  const majorVerts = [];

  const totalSteps = Math.floor(halfExtent / minorStep);
  for (let i = -totalSteps; i <= totalSteps; i++) {
    if (i === 0) continue; // Center axes are drawn with X/Z axis colors
    const coord = i * minorStep;
    const target = i % majorEvery === 0 ? majorVerts : minorVerts;
    // Line parallel to X
    target.push(-halfExtent, 0, coord, halfExtent, 0, coord);
    // Line parallel to Z
    target.push(coord, 0, -halfExtent, coord, 0, halfExtent);
  }

  const minorGeom = new THREE.BufferGeometry();
  minorGeom.setAttribute("position", new THREE.Float32BufferAttribute(minorVerts, 3));
  const minorMat = new THREE.LineBasicMaterial({ color: 0xdce1e7, transparent: true, opacity: 0.65 });
  gridGroup.add(new THREE.LineSegments(minorGeom, minorMat));

  const majorGeom = new THREE.BufferGeometry();
  majorGeom.setAttribute("position", new THREE.Float32BufferAttribute(majorVerts, 3));
  const majorMat = new THREE.LineBasicMaterial({ color: 0xb8c2cc, transparent: true, opacity: 0.85 });
  gridGroup.add(new THREE.LineSegments(majorGeom, majorMat));

  // Blender X-axis (Red)
  const xAxisGeom = new THREE.BufferGeometry();
  xAxisGeom.setAttribute("position", new THREE.Float32BufferAttribute([-halfExtent, 0.05, 0, halfExtent, 0.05, 0], 3));
  const xAxisMat = new THREE.LineBasicMaterial({ color: 0xe05252, transparent: true, opacity: 0.9 });
  gridGroup.add(new THREE.LineSegments(xAxisGeom, xAxisMat));

  // Blender Z-axis (Blue/Green horizontal depth axis)
  const zAxisGeom = new THREE.BufferGeometry();
  zAxisGeom.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.05, -halfExtent, 0, 0.05, halfExtent], 3));
  const zAxisMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.9 });
  gridGroup.add(new THREE.LineSegments(zAxisGeom, zAxisMat));

  return gridGroup;
}

/**
 * Clones a Three.js Group and overrides all descendant mesh/line materials with cached
 * semi-transparent ghost materials.
 * @param {object} sourceGroup - THREE.Group
 * @param {object} THREE - Three.js module
 * @param {number} opacity - Ghost opacity (default 0.22)
 * @returns {object} THREE.Group
 */
export function cloneGroupAsGhost(sourceGroup, THREE, opacity = DEFAULT_GHOST_OPACITY) {
  const cloned = sourceGroup.clone(true);
  cloned.traverse((node) => {
    if (node.isMesh && node.material) {
      const key = `mesh:${node.material.uuid}:${opacity}`;
      let ghostMat = ghostMaterialCache.get(key);
      if (!ghostMat) {
        ghostMat = node.material.clone();
        ghostMat.transparent = true;
        ghostMat.opacity = opacity;
        ghostMat.depthWrite = false;
        ghostMaterialCache.set(key, ghostMat);
      }
      node.material = ghostMat;
      node.castShadow = false;
      node.receiveShadow = false;
    } else if (node.isLineSegments && node.material) {
      const lineOpacity = Math.min(opacity * 0.6, 0.14);
      const key = `line:${node.material.uuid}:${lineOpacity}`;
      let ghostLineMat = ghostMaterialCache.get(key);
      if (!ghostLineMat) {
        ghostLineMat = node.material.clone();
        ghostLineMat.transparent = true;
        ghostLineMat.opacity = lineOpacity;
        ghostMaterialCache.set(key, ghostLineMat);
      }
      node.material = ghostLineMat;
    }
  });
  return cloned;
}

/**
 * Recursive LDraw parser and Three.js geometry/material cache builder backed by a single static bundle.
 */
export class LDrawPartBuilder {
  /**
   * @param {object} THREE - Three.js module instance
   * @param {string} baseUrl - Fallback base URL or bundle URL
   */
  constructor(THREE, baseUrl = "./assets/ldraw-bundle.json") {
    this.THREE = THREE;
    this.baseUrl = baseUrl;
    this.bundlePromise = null;
    this.textCache = new Map();
    this.partTitleCache = new Map();
    this.materialCache = new Map();
    this.edgeMaterialCache = new Map();
    this.partTemplateCache = new Map();
  }

  /**
   * Loads the pre-packed LDraw JSON bundle in a single HTTP request and populates textCache + partTitleCache.
   * @param {string} bundleUrl
   * @returns {Promise<void>}
   */
  async preloadBundle(bundleUrl = "./assets/ldraw-bundle.json") {
    if (this.bundlePromise) return this.bundlePromise;
    this.bundlePromise = fetch(bundleUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load LDraw bundle (${res.status})`);
        return res.json();
      })
      .then((bundleObj) => {
        for (const [rawKey, text] of Object.entries(bundleObj)) {
          const key = rawKey.replace(/\\/g, "/").toLowerCase();
          this.textCache.set(key, Promise.resolve(text));
          if (!this.partTitleCache.has(key)) {
            this.partTitleCache.set(key, extractPartTitleFromDat(text, key));
          }
        }
      });
    return this.bundlePromise;
  }

  /**
   * Returns the cached human-readable description for a part filename.
   * @param {string} partName
   * @returns {string}
   */
  getPartTitle(partName) {
    const key = String(partName || "").replace(/\\/g, "/").toLowerCase();
    return this.partTitleCache.get(key) || partName;
  }

  /**
   * Parses 3 consecutive coordinate tokens into a transformed Vector3.
   */
  parseVertex(tokens, offset, matrix) {
    return new this.THREE.Vector3(
      parseFloat(tokens[offset]),
      parseFloat(tokens[offset + 1]),
      parseFloat(tokens[offset + 2])
    ).applyMatrix4(matrix);
  }

  /**
   * Retrieves or creates a MeshPhysicalMaterial for the specified color code.
   */
  getMaterial(colorCode) {
    if (this.materialCache.has(colorCode)) return this.materialCache.get(colorCode);
    const THREE = this.THREE;
    const spec = EXTRA_LDRAW_COLORS[colorCode] || { hex: 0xCCCCCC, alpha: 1.0 };
    const isTrans = spec.alpha < 1.0;
    const mat = new THREE.MeshPhysicalMaterial({
      color: spec.hex,
      roughness: spec.rubber ? 0.78 : (isTrans ? 0.12 : 0.25),
      metalness: 0.02,
      clearcoat: spec.rubber ? 0.0 : 0.35,
      clearcoatRoughness: 0.2,
      transparent: isTrans,
      opacity: spec.alpha,
      side: THREE.DoubleSide
    });
    this.materialCache.set(colorCode, mat);
    return mat;
  }

  /**
   * Retrieves or creates a LineBasicMaterial for part edge lines.
   */
  getEdgeMaterial(colorCode) {
    if (this.edgeMaterialCache.has(colorCode)) return this.edgeMaterialCache.get(colorCode);
    const spec = EXTRA_LDRAW_COLORS[colorCode] || { edge: 0x333333 };
    const mat = new this.THREE.LineBasicMaterial({
      color: spec.edge || 0x333333,
      transparent: true,
      opacity: 0.28
    });
    this.edgeMaterialCache.set(colorCode, mat);
    return mat;
  }

  /**
   * Resolves LDraw .dat text from the preloaded bundle (or fetches individual fallback if needed).
   */
  async fetchDatText(partPath) {
    const key = partPath.replace(/\\/g, "/").toLowerCase();
    if (this.textCache.has(key)) return this.textCache.get(key);

    if (!this.bundlePromise && this.baseUrl.endsWith(".json")) {
      await this.preloadBundle(this.baseUrl);
      if (this.textCache.has(key)) return this.textCache.get(key);
    }

    for (const prefix of ["parts/", "p/"]) {
      if (key.startsWith(prefix)) {
        const stripped = key.slice(prefix.length);
        if (this.textCache.has(stripped)) return this.textCache.get(stripped);
      }
    }

    const fallbackBase = this.baseUrl.endsWith(".json") ? "/ldraw-res/" : this.baseUrl;
    const promise = fetch(fallbackBase + encodeURIComponent(key).replace(/%2F/g, "/"))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${key}: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!this.partTitleCache.has(key)) {
          this.partTitleCache.set(key, extractPartTitleFromDat(text, partPath));
        }
        return text;
      });
    this.textCache.set(key, promise);
    return promise;
  }

  /**
   * Recursively traverses sub-files and parses lines 1..4 into vertex coordinate buckets.
   */
  async collectGeometryBuckets(partPath, parentMatrix, inheritedColor, buckets, depth = 0) {
    if (depth > MAX_RECURSION_DEPTH) return;
    const text = await this.fetchDatText(partPath);
    const lines = text.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const type = line.charCodeAt(0) - ASCII_ZERO_CODE;
      if (type < 1 || type > 4) continue;

      const tok = line.split(/\s+/);
      if (tok.length < 2) continue;
      const rawColor = parseInt(tok[1], 10);
      const isInherited = rawColor === LDRAW_CURRENT_COLOR || rawColor === LDRAW_EDGE_COLOR;
      const resolvedColor = isInherited ? inheritedColor : rawColor;

      if (type === 1 && tok.length >= 15) {
        await this.parseSubfileReference(tok, parentMatrix, resolvedColor, buckets, depth);
      } else if (type === 2 && tok.length >= 8) {
        this.parseLineEdge(tok, parentMatrix, resolvedColor, buckets);
      } else if (type === 3 && tok.length >= 11) {
        this.parseTriangle(tok, parentMatrix, resolvedColor, buckets);
      } else if (type === 4 && tok.length >= 14) {
        this.parseQuad(tok, parentMatrix, resolvedColor, buckets);
      }
    }
  }

  async parseSubfileReference(tok, parentMatrix, resolvedColor, buckets, depth) {
    const x = parseFloat(tok[2]), y = parseFloat(tok[3]), z = parseFloat(tok[4]);
    const a = parseFloat(tok[5]), b = parseFloat(tok[6]), c = parseFloat(tok[7]);
    const d = parseFloat(tok[8]), e = parseFloat(tok[9]), f = parseFloat(tok[10]);
    const g = parseFloat(tok[11]), h = parseFloat(tok[12]), i = parseFloat(tok[13]);
    const subFile = tok.slice(14).join(" ").replace(/\\/g, "/");

    const childMat = new this.THREE.Matrix4().set(
      a, b, c, x,
      d, e, f, y,
      g, h, i, z,
      0, 0, 0, 1
    );
    const combined = new this.THREE.Matrix4().multiplyMatrices(parentMatrix, childMat);
    await this.collectGeometryBuckets(subFile, combined, resolvedColor, buckets, depth + 1);
  }

  parseLineEdge(tok, parentMatrix, resolvedColor, buckets) {
    if (!buckets.edges.has(resolvedColor)) buckets.edges.set(resolvedColor, []);
    const arr = buckets.edges.get(resolvedColor);
    const v1 = this.parseVertex(tok, 2, parentMatrix);
    const v2 = this.parseVertex(tok, 5, parentMatrix);
    arr.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
  }

  parseTriangle(tok, parentMatrix, resolvedColor, buckets) {
    if (!buckets.tris.has(resolvedColor)) buckets.tris.set(resolvedColor, []);
    const arr = buckets.tris.get(resolvedColor);
    const v1 = this.parseVertex(tok, 2, parentMatrix);
    const v2 = this.parseVertex(tok, 5, parentMatrix);
    const v3 = this.parseVertex(tok, 8, parentMatrix);
    arr.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
  }

  parseQuad(tok, parentMatrix, resolvedColor, buckets) {
    if (!buckets.tris.has(resolvedColor)) buckets.tris.set(resolvedColor, []);
    const arr = buckets.tris.get(resolvedColor);
    const v1 = this.parseVertex(tok, 2, parentMatrix);
    const v2 = this.parseVertex(tok, 5, parentMatrix);
    const v3 = this.parseVertex(tok, 8, parentMatrix);
    const v4 = this.parseVertex(tok, 11, parentMatrix);
    arr.push(
      v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
      v1.x, v1.y, v1.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z
    );
  }

  /**
   * Builds and caches a cloned THREE.Group containing meshes and edges for a part.
   */
  async buildPartGroup(partName, colorCode) {
    const cacheKey = `${partName}:${colorCode}`;
    if (this.partTemplateCache.has(cacheKey)) {
      return this.partTemplateCache.get(cacheKey).clone(true);
    }

    const THREE = this.THREE;
    const buckets = { tris: new Map(), edges: new Map() };
    await this.collectGeometryBuckets(partName, new THREE.Matrix4(), colorCode, buckets);

    const group = new THREE.Group();
    group.name = `ldraw_${partName}_${colorCode}`;

    for (const [col, positions] of buckets.tris.entries()) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, this.getMaterial(col));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    for (const [col, edgePositions] of buckets.edges.entries()) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
      const lines = new THREE.LineSegments(geom, this.getEdgeMaterial(col));
      group.add(lines);
    }

    this.partTemplateCache.set(cacheKey, group);
    return group.clone(true);
  }
}

export const LDrawPartCache = LDrawPartBuilder;

/**
 * Helper to create a positioned & oriented part Group from a tree partSpec.
 */
async function createPlacedPartGroup(THREE, partBuilder, partSpec, extraUserData = {}) {
  const partObj = await partBuilder.buildPartGroup(partSpec.part, partSpec.color);
  partObj.name = partSpec.id;
  const partTitle = partBuilder.getPartTitle(partSpec.part);
  const colorName = LDRAW_COLORS[partSpec.color]?.name || `Color_${partSpec.color}`;
  const metadata = {
    ...partSpec,
    partTitle,
    colorName,
    ...extraUserData
  };
  partObj.userData = metadata;
  partObj.traverse((child) => {
    if (child.isMesh) {
      child.userData = metadata;
    }
  });

  const [x, y, z] = partSpec.pos;
  const [a, b, c, d, e, f, g, h, i] = partSpec.rot;
  const m = new THREE.Matrix4().set(
    a, b, c, x,
    d, e, f, y,
    g, h, i, z,
    0, 0, 0, 1
  );
  partObj.applyMatrix4(m);
  return partObj;
}

/**
 * Builds the complete Three.js scene hierarchy mirroring ASSEMBLY_TREE structure:
 * rootGroup -> stepGroup_1..6 -> subGroup_* -> partMesh_*
 */
export async function buildAssemblyTreeSceneGraph(THREE, partBuilder) {
  const rootGroup = new THREE.Group();
  rootGroup.name = ASSEMBLY_TREE.id;
  rootGroup.rotation.x = Math.PI;
  rootGroup.scale.setScalar(0.5);

  for (const stepNode of ASSEMBLY_TREE.children) {
    const stepGroup = new THREE.Group();
    stepGroup.name = stepNode.id;
    stepGroup.userData = { stepNumber: stepNode.stepNumber, type: "step" };

    for (const subNode of stepNode.children) {
      const subGroup = new THREE.Group();
      subGroup.name = subNode.id;
      subGroup.userData = { type: "subassembly", stepNumber: stepNode.stepNumber };

      for (const partSpec of subNode.parts) {
        const partObj = await createPlacedPartGroup(THREE, partBuilder, partSpec, {
          subassemblyId: subNode.id,
          stepNumber: stepNode.stepNumber
        });
        subGroup.add(partObj);
      }

      stepGroup.add(subGroup);
    }

    rootGroup.add(stepGroup);
  }

  return rootGroup;
}

export const buildTreeSceneGraph = buildAssemblyTreeSceneGraph;

/**
 * Builds the vertical 3D preview column of enlarged parts on the left side for the given stepNode.
 * Arranged top-to-bottom at a fixed enlarged scale so the user can scroll downward smoothly.
 */
export async function buildStepPartsPreviewColumn(THREE, partBuilder, stepNode) {
  const container = new THREE.Group();
  if (!stepNode || !Array.isArray(stepNode.stepInventory)) return container;
  container.name = `preview_col_${stepNode.id}`;

  const itemEntries = [];
  for (const item of stepNode.stepInventory) {
    const cluster = new THREE.Group();
    for (let q = 0; q < item.qty; q++) {
      const pGroup = await partBuilder.buildPartGroup(item.part, item.color);
      pGroup.rotation.x = Math.PI;
      pGroup.position.set(q * 16, 0, -q * 16);
      cluster.add(pGroup);
    }

    const box = new THREE.Box3().setFromObject(cluster);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cluster.children.forEach((ch) => ch.position.sub(center));

    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const normScale = maxDim > 85 ? (85 / maxDim) : (maxDim < 36 ? 1.45 : 1.08);
    cluster.scale.setScalar(normScale);

    const partTitle = partBuilder.getPartTitle(item.part);
    const colorName = LDRAW_COLORS[item.color]?.name || `Color_${item.color}`;
    const meta = {
      part: item.part,
      color: item.color,
      qty: item.qty,
      partTitle,
      colorName,
      stepNumber: stepNode.stepNumber
    };
    cluster.userData = meta;
    cluster.traverse((ch) => {
      if (ch.isMesh) ch.userData = meta;
    });

    const scaledHeight = Math.max(size.y * normScale, 54);
    itemEntries.push({ group: cluster, height: scaledHeight });
  }

  const gap = 36;
  const totalHeight = itemEntries.reduce((acc, it) => acc + it.height, 0) + gap * Math.max(0, itemEntries.length - 1);
  const topStart = 95;
  let cursorY = topStart;

  for (const it of itemEntries) {
    it.group.position.y = cursorY - it.height / 2;
    cursorY -= it.height + gap;
    container.add(it.group);
  }

  const columnScale = 0.64;
  container.scale.setScalar(columnScale);

  const visibleSpanWorld = 190;
  const totalWorldHeight = totalHeight * columnScale;
  const maxScrollWorldY = Math.max(0, totalWorldHeight - visibleSpanWorld);
  container.userData = {
    totalHeight: totalWorldHeight,
    maxScrollWorldY,
    baseOffsetY: 0
  };
  return container;
}

export const buildStepPartsPreviewRow = buildStepPartsPreviewColumn;
export const buildStepPartsPreviewGroup = buildStepPartsPreviewColumn;

/**
 * Aggregates a subassembly's parts list into unique { part, color, qty } unit entries.
 */
function aggregateSubassemblyUnitParts(partsList = []) {
  const map = new Map();
  for (const p of partsList) {
    const key = `${p.part}:${p.color}`;
    if (!map.has(key)) {
      map.set(key, { part: p.part, color: p.color, qty: 0 });
    }
    map.get(key).qty += 1;
  }
  return Array.from(map.values());
}

/**
 * Builds the two 3D groups for the right-side detail panel when a bottom subassembly is clicked:
 * - topGroup: Enlarged subassembly in context where previous parts have ULTRA_GHOST_OPACITY (0.08)
 * - bottomGroup: Individual unit components ("satuan komponen yang dipakai") in that subassembly
 */
export async function buildSubassemblyDetailViews(
  THREE,
  partBuilder,
  stepNode,
  subIndex,
  allStepNodes = ASSEMBLY_TREE.children
) {
  const topGroup = new THREE.Group();
  const bottomGroup = new THREE.Group();
  if (!stepNode || !Array.isArray(stepNode.children) || !stepNode.children[subIndex]) {
    return { topGroup, bottomGroup };
  }

  const subNode = stepNode.children[subIndex];
  topGroup.name = `detail_top_${subNode.id}`;
  bottomGroup.name = `detail_bottom_${subNode.id}`;

  const priorParts = [];
  for (const st of allStepNodes) {
    if (st.stepNumber < stepNode.stepNumber) {
      for (const s of st.children || []) {
        for (const p of s.parts || []) {
          priorParts.push({ partSpec: p, subId: s.id, stepNum: st.stepNumber });
        }
      }
    }
  }
  for (let i = 0; i < subIndex; i++) {
    const earlierSub = stepNode.children[i];
    for (const p of earlierSub.parts || []) {
      priorParts.push({ partSpec: p, subId: earlierSub.id, stepNum: stepNode.stepNumber });
    }
  }

  const topSpinner = new THREE.Group();
  const modelRoot = new THREE.Group();
  modelRoot.rotation.x = Math.PI;

  const ghostGroup = new THREE.Group();
  const activeGroup = new THREE.Group();

  for (const item of priorParts) {
    const placed = await createPlacedPartGroup(THREE, partBuilder, item.partSpec, {
      subassemblyId: item.subId,
      stepNumber: item.stepNum,
      isGhostContext: true
    });
    ghostGroup.add(cloneGroupAsGhost(placed, THREE, ULTRA_GHOST_OPACITY));
  }

  const partCodes = [];
  const partTitles = [];
  for (const partSpec of subNode.parts || []) {
    const placed = await createPlacedPartGroup(THREE, partBuilder, partSpec, {
      subassemblyId: subNode.id,
      stepNumber: stepNode.stepNumber,
      isGhostContext: false
    });
    activeGroup.add(placed);
    if (!partCodes.includes(partSpec.part)) partCodes.push(partSpec.part);
    const t = partBuilder.getPartTitle(partSpec.part);
    if (!partTitles.includes(t)) partTitles.push(t);
  }

  modelRoot.add(ghostGroup);
  modelRoot.add(activeGroup);

  modelRoot.updateMatrixWorld(true);
  const activeBox = new THREE.Box3().setFromObject(activeGroup);
  const pivotCenter = new THREE.Vector3();
  activeBox.getCenter(pivotCenter);
  modelRoot.position.sub(pivotCenter);

  const activeSize = new THREE.Vector3();
  activeBox.getSize(activeSize);
  const activeSpan = Math.max(activeSize.x, activeSize.y, activeSize.z, 45);
  const enlargedScale = Math.min(0.82, 115 / activeSpan);
  topSpinner.scale.setScalar(enlargedScale);
  topSpinner.userData = {
    subassemblyId: subNode.id,
    stepNumber: stepNode.stepNumber,
    part: partCodes.join(", "),
    partTitle: partTitles.join(" + "),
    qty: (subNode.parts || []).length
  };
  topSpinner.add(modelRoot);
  topGroup.add(topSpinner);

  const unitItems = aggregateSubassemblyUnitParts(subNode.parts || []);
  const unitClusters = [];

  for (const uItem of unitItems) {
    const cluster = new THREE.Group();
    for (let q = 0; q < uItem.qty; q++) {
      const pGroup = await partBuilder.buildPartGroup(uItem.part, uItem.color);
      pGroup.rotation.x = Math.PI;
      pGroup.position.set(q * 14, 0, -q * 14);
      cluster.add(pGroup);
    }

    const box = new THREE.Box3().setFromObject(cluster);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cluster.children.forEach((ch) => ch.position.sub(center));

    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const normScale = maxDim > 75 ? (75 / maxDim) : (maxDim < 30 ? 1.35 : 1.0);
    cluster.scale.setScalar(normScale);

    const partTitle = partBuilder.getPartTitle(uItem.part);
    const meta = {
      part: uItem.part,
      color: uItem.color,
      qty: uItem.qty,
      partTitle,
      stepNumber: stepNode.stepNumber,
      subassemblyId: subNode.id
    };
    cluster.userData = meta;
    cluster.traverse((ch) => {
      if (ch.isMesh) ch.userData = meta;
    });

    unitClusters.push({ group: cluster, width: Math.max(size.x * normScale, 48) });
  }

  const cols = Math.min(unitClusters.length, 2);
  const cellX = 88;
  const cellY = 74;
  const rows = Math.ceil(unitClusters.length / Math.max(1, cols));

  unitClusters.forEach((entry, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const rowCount = r === rows - 1 ? (unitClusters.length - r * cols) : cols;
    const xOffset = (c - (rowCount - 1) / 2) * cellX;
    const yOffset = ((rows - 1) / 2 - r) * cellY;
    entry.group.position.set(xOffset, yOffset, 0);
    bottomGroup.add(entry.group);
  });

  bottomGroup.scale.setScalar(0.58);
  return { topGroup, bottomGroup };
}

/**
 * Builds the bottom "Komponen Yang Dibuat" 3D subassembly strip for a given stepNode.
 * Uses uniform bounding-box centering and even slot layout so all subassemblies spin uniformly.
 */
export async function buildStepSubassemblyPreviews(THREE, partBuilder, stepNode, allStepNodes = ASSEMBLY_TREE.children) {
  const container = new THREE.Group();
  if (!stepNode || !Array.isArray(stepNode.children)) return container;
  container.name = `subassemblies_${stepNode.id}`;

  const priorStepParts = [];
  for (const st of allStepNodes) {
    if (st.stepNumber < stepNode.stepNumber) {
      for (const sub of st.children || []) {
        for (const p of sub.parts || []) {
          priorStepParts.push({ partSpec: p, subId: sub.id, stepNum: st.stepNumber });
        }
      }
    }
  }

  const cumulativeCurrentStepParts = [];
  const subClusters = [];

  for (let subIndex = 0; subIndex < stepNode.children.length; subIndex++) {
    const subNode = stepNode.children[subIndex];
    const spinner = new THREE.Group();
    spinner.name = `sub_preview_${subNode.id}`;

    const modelRoot = new THREE.Group();
    modelRoot.rotation.x = Math.PI;

    const activeGroup = new THREE.Group();
    const ghostGroup = new THREE.Group();

    const allPriorForThisSub = [...priorStepParts, ...cumulativeCurrentStepParts];
    for (const item of allPriorForThisSub) {
      const placed = await createPlacedPartGroup(THREE, partBuilder, item.partSpec, {
        subassemblyId: subNode.id,
        subIndex,
        stepNumber: stepNode.stepNumber,
        isGhostContext: true
      });
      ghostGroup.add(cloneGroupAsGhost(placed, THREE, DEFAULT_GHOST_OPACITY));
    }

    const partCodes = [];
    const partTitles = [];
    for (const partSpec of subNode.parts || []) {
      const placed = await createPlacedPartGroup(THREE, partBuilder, partSpec, {
        subassemblyId: subNode.id,
        subIndex,
        stepNumber: stepNode.stepNumber,
        isGhostContext: false
      });
      activeGroup.add(placed);
      if (!partCodes.includes(partSpec.part)) partCodes.push(partSpec.part);
      const t = partBuilder.getPartTitle(partSpec.part);
      if (!partTitles.includes(t)) partTitles.push(t);

      cumulativeCurrentStepParts.push({
        partSpec,
        subId: subNode.id,
        stepNum: stepNode.stepNumber
      });
    }

    modelRoot.add(ghostGroup);
    modelRoot.add(activeGroup);

    modelRoot.updateMatrixWorld(true);
    const fullBox = new THREE.Box3().setFromObject(modelRoot);
    const fullCenter = new THREE.Vector3();
    const fullSize = new THREE.Vector3();
    fullBox.getCenter(fullCenter);
    fullBox.getSize(fullSize);
    modelRoot.position.sub(fullCenter);

    const maxSpan = Math.max(fullSize.x, fullSize.y, fullSize.z, 70);
    const fitScale = Math.min(0.38, 76 / maxSpan);
    spinner.scale.setScalar(fitScale);
    spinner.add(modelRoot);

    const summaryMeta = {
      subassemblyId: subNode.id,
      subIndex,
      stepNumber: stepNode.stepNumber,
      part: partCodes.join(", "),
      partTitle: partTitles.join(" + "),
      qty: (subNode.parts || []).length
    };
    spinner.userData = summaryMeta;
    spinner.traverse((ch) => {
      if (ch.isMesh) {
        ch.userData = { ...ch.userData, subIndex, subassemblyId: subNode.id };
      }
    });

    subClusters.push(spinner);
  }

  const slotWidth = 132;
  const totalWidth = slotWidth * Math.max(0, subClusters.length - 1);
  let cursorX = -totalWidth / 2;

  for (const spinner of subClusters) {
    spinner.position.set(cursorX, -4, 0);
    cursorX += slotWidth;
    container.add(spinner);
  }

  return container;
}

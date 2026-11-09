import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ASSEMBLY_TREE, getVisibleStepNumbers, getActiveStepNode } from "./assembly-tree.js";
import { createStateController } from "./state-controller.js";
import {
  LDrawPartBuilder,
  createBlenderGrid,
  buildAssemblyTreeSceneGraph,
  buildStepPartsPreviewColumn,
  buildStepSubassemblyPreviews,
  buildSubassemblyDetailViews
} from "./ldraw-scene-builder.js";

const mainCanvas = document.getElementById("main-canvas");
const partsCanvas = document.getElementById("parts-canvas");
const partsTray = document.getElementById("parts-tray");
const partsStickyWrap = document.getElementById("parts-sticky-wrap");
const partsScrollSpacer = document.getElementById("parts-scroll-spacer");
const subassemblyBar = document.getElementById("subassembly-bar");
const subassemblyCanvas = document.getElementById("subassembly-canvas");
const detailPanel = document.getElementById("subassembly-detail-panel");
const detailTopWrap = document.getElementById("detail-top-wrap");
const detailTopCanvas = document.getElementById("detail-top-canvas");
const detailBottomWrap = document.getElementById("detail-bottom-wrap");
const detailBottomCanvas = document.getElementById("detail-bottom-canvas");
const partTooltip = document.getElementById("part-tooltip");
const infoBtn = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalClose = document.getElementById("modal-close");

if (infoBtn && infoModal) {
  const toggleModal = (show) => {
    infoModal.classList.toggle("hidden", !show);
  };
  infoBtn.addEventListener("click", () => toggleModal(true));
  if (modalClose) modalClose.addEventListener("click", () => toggleModal(false));
  if (modalBackdrop) modalBackdrop.addEventListener("click", () => toggleModal(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !infoModal.classList.contains("hidden")) {
      toggleModal(false);
    }
  });
}


const partsDebugLayer = document.getElementById("parts-debug-labels");
const subassemblyDebugLayer = document.getElementById("subassembly-debug-labels");
const detailTopDebugLayer = document.getElementById("detail-top-debug-labels");
const detailBottomDebugLayer = document.getElementById("detail-bottom-debug-labels");
const mainDebugLayer = document.getElementById("main-debug-labels");
const dots = Array.from(document.querySelectorAll(".dot"));

const DROP_DISTANCE = -45;
const DROP_DURATION_MS = 280;

// Viewport offset (shifts main 3D model up and to the right to clear left list & bottom strip)
const VIEWPORT_OFFSET_X = -95;
const VIEWPORT_OFFSET_Y = 55;

// 1. Main 3D Editor Scene (#f8f9fa background + Blender grid)
const mainRenderer = new THREE.WebGLRenderer({ canvas: mainCanvas, antialias: true, powerPreference: "high-performance" });
mainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
mainRenderer.setClearColor(0xf8f9fa, 1);
mainRenderer.shadowMap.enabled = true;
mainRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

const mainScene = new THREE.Scene();
mainScene.background = new THREE.Color(0xf8f9fa);
mainScene.fog = new THREE.Fog(0xf8f9fa, 750, 1450);

const mainCamera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 3000);
mainCamera.position.set(-220, 165, -240);

const controls = new OrbitControls(mainCamera, mainCanvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 28, 15);
controls.minDistance = 80;
controls.maxDistance = 900;

window.mainCamera = mainCamera;
window.controls = controls;

mainScene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.25));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
dirLight.position.set(-180, 320, -200);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -220;
dirLight.shadow.camera.right = 220;
dirLight.shadow.camera.top = 220;
dirLight.shadow.camera.bottom = -220;
mainScene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.65);
fillLight.position.set(200, 140, 220);
mainScene.add(fillLight);

const blenderGrid = createBlenderGrid(THREE);
mainScene.add(blenderGrid);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1200, 1200),
  new THREE.ShadowMaterial({ opacity: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -8.05;
ground.receiveShadow = true;
mainScene.add(ground);

// 2. Left Component List 3D Scene (Fixed camera distance so items stay large; scrollable vertically)
const partsRenderer = new THREE.WebGLRenderer({ canvas: partsCanvas, antialias: true, alpha: true });
partsRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const partsScene = new THREE.Scene();
const partsCamera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
partsCamera.position.set(0, 24, 285);
partsCamera.lookAt(0, 0, 0);

partsScene.add(new THREE.HemisphereLight(0xffffff, 0xdbe7f3, 1.35));
const partsDirLight = new THREE.DirectionalLight(0xffffff, 1.15);
partsDirLight.position.set(90, 180, 200);
partsScene.add(partsDirLight);

// 3. Bottom "Komponen Yang Dibuat" Subassembly 3D Scene
const subRenderer = new THREE.WebGLRenderer({ canvas: subassemblyCanvas, antialias: true, alpha: true });
subRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const subScene = new THREE.Scene();
const subCamera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
subCamera.position.set(0, 52, 235);
subCamera.lookAt(0, -4, 0);

subScene.add(new THREE.HemisphereLight(0xffffff, 0xdbe7f3, 1.35));
const subDirLight = new THREE.DirectionalLight(0xffffff, 1.15);
subDirLight.position.set(-80, 160, 180);
subScene.add(subDirLight);

// 4. Right Detail Panel Top (Enlarged Subassembly + Ultra-Transparent Context) & Bottom (Unit Components)
const detailTopRenderer = new THREE.WebGLRenderer({ canvas: detailTopCanvas, antialias: true, alpha: true });
detailTopRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const detailTopScene = new THREE.Scene();
const detailTopCamera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
detailTopCamera.position.set(0, 62, 195);
detailTopCamera.lookAt(0, 0, 0);
detailTopScene.add(new THREE.HemisphereLight(0xffffff, 0xdbe7f3, 1.35));
const detailTopLight = new THREE.DirectionalLight(0xffffff, 1.2);
detailTopLight.position.set(-90, 180, 170);
detailTopScene.add(detailTopLight);

const detailBottomRenderer = new THREE.WebGLRenderer({ canvas: detailBottomCanvas, antialias: true, alpha: true });
detailBottomRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const detailBottomScene = new THREE.Scene();
const detailBottomCamera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
detailBottomCamera.position.set(0, 35, 220);
detailBottomCamera.lookAt(0, 0, 0);
detailBottomScene.add(new THREE.HemisphereLight(0xffffff, 0xdbe7f3, 1.35));
const detailBottomLight = new THREE.DirectionalLight(0xffffff, 1.2);
detailBottomLight.position.set(80, 170, 190);
detailBottomScene.add(detailBottomLight);

// 5. State, Caches, Debug Config & Raycaster
const partBuilder = new LDrawPartBuilder(THREE, "./assets/ldraw-bundle.json");
const stateCtrl = createStateController(0);
const previewGroupsByStep = new Map();
const subassemblyGroupsByStep = new Map();
const detailViewsByStepAndSub = new Map();
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

let treeRootGroup = null;
let activeDropAnim = null;
let isDebugMode = false;
let activeDetailViews = null;

async function detectDebugMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("debug") === "1" || urlParams.get("debug") === "true") {
    return true;
  }
  try {
    const res = await fetch("/app-config.json", { cache: "no-store" });
    if (res.ok) {
      const cfg = await res.json();
      return Boolean(cfg && cfg.debug);
    }
  } catch (_) {
    // Ignore fetch errors in offline/static environments
  }
  return false;
}

/**
 * Lazily builds or retrieves the cached detail views for (stepNumber, subIndex).
 */
async function ensureSubassemblyDetailView(stepNumber, subIndex) {
  if (!detailViewsByStepAndSub.has(stepNumber)) {
    detailViewsByStepAndSub.set(stepNumber, []);
  }
  const stepDetails = detailViewsByStepAndSub.get(stepNumber);
  if (stepDetails[subIndex]) {
    return stepDetails[subIndex];
  }
  const stepNode = getActiveStepNode(stepNumber);
  if (!stepNode || !stepNode.children[subIndex]) return null;

  const views = await buildSubassemblyDetailViews(THREE, partBuilder, stepNode, subIndex, ASSEMBLY_TREE.children);
  views.topGroup.visible = false;
  views.bottomGroup.visible = false;
  detailTopScene.add(views.topGroup);
  detailBottomScene.add(views.bottomGroup);
  stepDetails[subIndex] = views;
  return views;
}

async function init() {
  const [debugFlag] = await Promise.all([
    detectDebugMode(),
    partBuilder.preloadBundle("./assets/ldraw-bundle.json")
  ]);
  isDebugMode = debugFlag;
  window.__DEBUG_MODE__ = isDebugMode;

  handleResize();
  treeRootGroup = await buildAssemblyTreeSceneGraph(THREE, partBuilder);
  mainScene.add(treeRootGroup);

  window.__ASSEMBLY_TREE__ = ASSEMBLY_TREE;
  window.__SCENE_TREE__ = treeRootGroup;

  for (const stepNode of ASSEMBLY_TREE.children) {
    const previewCol = await buildStepPartsPreviewColumn(THREE, partBuilder, stepNode);
    previewCol.visible = false;
    partsScene.add(previewCol);
    previewGroupsByStep.set(stepNode.stepNumber, previewCol);

    const subRow = await buildStepSubassemblyPreviews(THREE, partBuilder, stepNode, ASSEMBLY_TREE.children);
    subRow.visible = false;
    subScene.add(subRow);
    subassemblyGroupsByStep.set(stepNode.stepNumber, subRow);
  }

  applyState(stateCtrl.getState(), null);
}

function updateMainCameraFraming() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  mainCamera.aspect = w / h;
  mainCamera.setViewOffset(w, h, VIEWPORT_OFFSET_X, VIEWPORT_OFFSET_Y, w, h);
  mainCamera.updateProjectionMatrix();
}

function updatePartsScrollLayout(stepNumber) {
  const col = previewGroupsByStep.get(stepNumber);
  const trayHeight = partsTray.clientHeight || (window.innerHeight - 32);
  if (!col) {
    partsScrollSpacer.style.height = `${trayHeight}px`;
    return;
  }
  const maxScrollWorldY = col.userData?.maxScrollWorldY || 0;
  // Convert world scroll range into smooth pixel scroll range (3.2px per world unit)
  const extraPx = Math.ceil(maxScrollWorldY * 3.2);
  partsScrollSpacer.style.height = `${trayHeight + extraPx}px`;
  partsTray.scrollTop = 0;
  col.position.y = 0;
}

function syncPartsScrollPosition() {
  const activeCol = previewGroupsByStep.get(stateCtrl.getState());
  if (!activeCol || !activeCol.visible) return;
  const maxScrollPx = Math.max(0, partsTray.scrollHeight - partsTray.clientHeight);
  const maxScrollWorldY = activeCol.userData?.maxScrollWorldY || 0;
  if (maxScrollPx <= 0 || maxScrollWorldY <= 0) {
    activeCol.position.y = 0;
    return;
  }
  const ratio = Math.min(1, Math.max(0, partsTray.scrollTop / maxScrollPx));
  activeCol.position.y = ratio * maxScrollWorldY;
}

partsTray.addEventListener("scroll", syncPartsScrollPosition, { passive: true });

function closeDetailPanel() {
  detailPanel.classList.add("hidden");
  activeDetailViews = null;
  for (const list of detailViewsByStepAndSub.values()) {
    for (const v of list) {
      if (!v) continue;
      v.topGroup.visible = false;
      v.bottomGroup.visible = false;
    }
  }
  detailTopDebugLayer.innerHTML = "";
  detailBottomDebugLayer.innerHTML = "";
}

async function openSubassemblyDetail(stepNumber, subIndex) {
  const target = await ensureSubassemblyDetailView(stepNumber, subIndex);
  if (!target) return;

  for (const list of detailViewsByStepAndSub.values()) {
    for (const v of list) {
      if (!v) continue;
      v.topGroup.visible = false;
      v.bottomGroup.visible = false;
    }
  }

  target.topGroup.visible = true;
  target.bottomGroup.visible = true;
  activeDetailViews = target;
  detailPanel.classList.remove("hidden");
  handleResize();
}

window.openSubassemblyDetail = openSubassemblyDetail;

function applyState(stateIndex, prevState) {
  dots.forEach((dotElement, idx) => dotElement.classList.toggle("active", idx === stateIndex));
  closeDetailPanel();

  if (!treeRootGroup) return;
  const visibleSteps = new Set(getVisibleStepNumbers(stateIndex));

  for (const stepGroup of treeRootGroup.children) {
    const stepNum = stepGroup.userData.stepNumber;
    const isVisible = visibleSteps.has(stepNum);
    stepGroup.visible = isVisible;
    stepGroup.position.y = 0;

    if (isVisible && stepNum === stateIndex && prevState !== null && stateIndex > prevState && stateIndex >= 1 && stateIndex <= 6) {
      stepGroup.position.y = DROP_DISTANCE;
      activeDropAnim = { group: stepGroup, startTime: performance.now(), duration: DROP_DURATION_MS };
    }
  }

  const activeStep = getActiveStepNode(stateIndex);
  if (!activeStep) {
    partsTray.classList.add("hidden");
    subassemblyBar.classList.add("hidden");
    for (const g of previewGroupsByStep.values()) g.visible = false;
    for (const g of subassemblyGroupsByStep.values()) g.visible = false;
  } else {
    partsTray.classList.remove("hidden");
    subassemblyBar.classList.remove("hidden");
    for (const [sNum, g] of previewGroupsByStep.entries()) {
      g.visible = sNum === activeStep.stepNumber;
    }
    for (const [sNum, g] of subassemblyGroupsByStep.entries()) {
      g.visible = sNum === activeStep.stepNumber;
    }
    updatePartsScrollLayout(activeStep.stepNumber);
    handleResize();
  }

  hideTooltip();
}

stateCtrl.subscribe((nextState, prevState) => {
  applyState(nextState, prevState);
});

dots.forEach((dot, idx) => {
  dot.addEventListener("click", () => stateCtrl.setState(idx));
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    stateCtrl.next();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    stateCtrl.prev();
  }
});

function handleResize() {
  updateMainCameraFraming();
  mainRenderer.setSize(window.innerWidth, window.innerHeight);

  const trayRect = partsStickyWrap.getBoundingClientRect();
  if (trayRect.width > 0 && trayRect.height > 0) {
    partsCamera.aspect = trayRect.width / trayRect.height;
    partsCamera.updateProjectionMatrix();
    partsRenderer.setSize(trayRect.width, trayRect.height);
  }

  const subRect = subassemblyBar.getBoundingClientRect();
  if (subRect.width > 0 && subRect.height > 0) {
    subCamera.aspect = subRect.width / subRect.height;
    subCamera.updateProjectionMatrix();
    subRenderer.setSize(subRect.width, subRect.height);
  }

  const topRect = detailTopWrap.getBoundingClientRect();
  if (topRect.width > 0 && topRect.height > 0) {
    detailTopCamera.aspect = topRect.width / topRect.height;
    detailTopCamera.updateProjectionMatrix();
    detailTopRenderer.setSize(topRect.width, topRect.height);
  }

  const botRect = detailBottomWrap.getBoundingClientRect();
  if (botRect.width > 0 && botRect.height > 0) {
    detailBottomCamera.aspect = botRect.width / botRect.height;
    detailBottomCamera.updateProjectionMatrix();
    detailBottomRenderer.setSize(botRect.width, botRect.height);
  }
}

window.addEventListener("resize", handleResize);

// Hover & Click Raycasting
function showTooltip(meta, clientX, clientY) {
  const title = meta.partTitle || meta.part;
  const qtyText = meta.qty && meta.qty > 1 ? ` (x${meta.qty})` : "";
  const debugCode = isDebugMode && meta.part ? ` [${meta.part}]` : "";
  partTooltip.textContent = `${title}${qtyText}${debugCode}`;
  partTooltip.style.left = `${Math.min(window.innerWidth - 260, clientX + 14)}px`;
  partTooltip.style.top = `${Math.max(12, clientY - 10)}px`;
  partTooltip.classList.remove("hidden");
}

function hideTooltip() {
  partTooltip.classList.add("hidden");
}

function findHitMetadata(event, canvasEl, camera, rootObjects) {
  const rect = canvasEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(rootObjects, true);
  for (const hit of hits) {
    let curr = hit.object;
    while (curr) {
      if (curr.userData && (curr.userData.partTitle || curr.userData.part)) {
        return curr.userData;
      }
      curr = curr.parent;
    }
  }
  return null;
}

function handleCanvasHover(event, canvasEl, camera, rootObjects) {
  const meta = findHitMetadata(event, canvasEl, camera, rootObjects);
  if (meta) {
    showTooltip(meta, event.clientX, event.clientY);
    return true;
  }
  return false;
}

partsCanvas.addEventListener("mousemove", (e) => {
  const activeGroup = previewGroupsByStep.get(stateCtrl.getState());
  if (!activeGroup || !activeGroup.visible || !handleCanvasHover(e, partsCanvas, partsCamera, activeGroup.children)) {
    hideTooltip();
  }
});
partsCanvas.addEventListener("mouseleave", hideTooltip);

subassemblyCanvas.addEventListener("mousemove", (e) => {
  const activeSub = subassemblyGroupsByStep.get(stateCtrl.getState());
  if (!activeSub || !activeSub.visible || !handleCanvasHover(e, subassemblyCanvas, subCamera, activeSub.children)) {
    hideTooltip();
  }
});
subassemblyCanvas.addEventListener("mouseleave", hideTooltip);

// Clicking a subassembly in the bottom "Komponen Yang Dibuat" bar opens the right detail panel
subassemblyCanvas.addEventListener("click", (e) => {
  const stepNum = stateCtrl.getState();
  const activeSub = subassemblyGroupsByStep.get(stepNum);
  if (!activeSub || !activeSub.visible) return;
  const meta = findHitMetadata(e, subassemblyCanvas, subCamera, activeSub.children);
  if (meta && Number.isInteger(meta.subIndex)) {
    openSubassemblyDetail(stepNum, meta.subIndex);
  }
});

detailTopCanvas.addEventListener("mousemove", (e) => {
  if (!activeDetailViews || !handleCanvasHover(e, detailTopCanvas, detailTopCamera, activeDetailViews.topGroup.children)) {
    hideTooltip();
  }
});
detailTopCanvas.addEventListener("mouseleave", hideTooltip);

detailBottomCanvas.addEventListener("mousemove", (e) => {
  if (!activeDetailViews || !handleCanvasHover(e, detailBottomCanvas, detailBottomCamera, activeDetailViews.bottomGroup.children)) {
    hideTooltip();
  }
});
detailBottomCanvas.addEventListener("mouseleave", hideTooltip);

mainCanvas.addEventListener("mousemove", (e) => {
  if (!treeRootGroup) return;
  const visibleSteps = treeRootGroup.children.filter((ch) => ch.visible);
  if (!handleCanvasHover(e, mainCanvas, mainCamera, visibleSteps)) {
    hideTooltip();
  }
});
mainCanvas.addEventListener("mouseleave", hideTooltip);

function renderDebugBadgesForGroup(layerEl, items, camera, width, height) {
  layerEl.innerHTML = "";
  if (!isDebugMode || width <= 0 || height <= 0) return;
  const tempVec = new THREE.Vector3();
  for (const item of items) {
    const code = item.userData?.part;
    if (!code) continue;
    item.getWorldPosition(tempVec);
    tempVec.project(camera);
    if (tempVec.z < -1 || tempVec.z > 1) continue;
    const x = (tempVec.x * 0.5 + 0.5) * width;
    const y = (-tempVec.y * 0.5 + 0.5) * height;
    const badge = document.createElement("div");
    badge.className = "debug-badge";
    badge.textContent = code;
    badge.style.left = `${x}px`;
    badge.style.top = `${y}px`;
    layerEl.appendChild(badge);
  }
}

function animate(now) {
  requestAnimationFrame(animate);

  if (activeDropAnim) {
    const progress = Math.min(1, (now - activeDropAnim.startTime) / activeDropAnim.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    activeDropAnim.group.position.y = DROP_DISTANCE * (1 - eased);
    if (progress >= 1) activeDropAnim = null;
  }

  const uniformAngle = now * 0.001;

  // Continuous spin on left component models
  const activePreviewCol = previewGroupsByStep.get(stateCtrl.getState());
  if (activePreviewCol && activePreviewCol.visible) {
    activePreviewCol.children.forEach((cluster) => {
      cluster.rotation.y = uniformAngle;
    });
  }

  // Strictly uniform 360-degree spin on bottom "Komponen Yang Dibuat" models (identical angle & speed)
  const activeSubRow = subassemblyGroupsByStep.get(stateCtrl.getState());
  if (activeSubRow && activeSubRow.visible) {
    activeSubRow.children.forEach((spinner) => {
      spinner.rotation.y = uniformAngle;
    });
  }

  // Spin right-side detail panel models when open
  if (activeDetailViews && !detailPanel.classList.contains("hidden")) {
    activeDetailViews.topGroup.children.forEach((spinner) => {
      spinner.rotation.y = uniformAngle;
    });
    activeDetailViews.bottomGroup.children.forEach((unitCluster) => {
      unitCluster.rotation.y = uniformAngle;
    });
  }

  controls.update();
  mainRenderer.render(mainScene, mainCamera);

  if (!partsTray.classList.contains("hidden")) {
    partsRenderer.render(partsScene, partsCamera);
    if (isDebugMode && activePreviewCol) {
      renderDebugBadgesForGroup(
        partsDebugLayer,
        activePreviewCol.children,
        partsCamera,
        partsStickyWrap.clientWidth,
        partsStickyWrap.clientHeight
      );
    }
  } else if (isDebugMode) {
    partsDebugLayer.innerHTML = "";
  }

  if (!subassemblyBar.classList.contains("hidden")) {
    subRenderer.render(subScene, subCamera);
    if (isDebugMode && activeSubRow) {
      renderDebugBadgesForGroup(
        subassemblyDebugLayer,
        activeSubRow.children,
        subCamera,
        subassemblyBar.clientWidth,
        subassemblyBar.clientHeight
      );
    }
  } else if (isDebugMode) {
    subassemblyDebugLayer.innerHTML = "";
  }

  if (!detailPanel.classList.contains("hidden") && activeDetailViews) {
    detailTopRenderer.render(detailTopScene, detailTopCamera);
    detailBottomRenderer.render(detailBottomScene, detailBottomCamera);
    if (isDebugMode) {
      renderDebugBadgesForGroup(
        detailTopDebugLayer,
        activeDetailViews.topGroup.children,
        detailTopCamera,
        detailTopWrap.clientWidth,
        detailTopWrap.clientHeight
      );
      renderDebugBadgesForGroup(
        detailBottomDebugLayer,
        activeDetailViews.bottomGroup.children,
        detailBottomCamera,
        detailBottomWrap.clientWidth,
        detailBottomWrap.clientHeight
      );
    }
  }

  if (isDebugMode && treeRootGroup) {
    const activeStepNum = stateCtrl.getState();
    const targetParts = [];
    for (const stepGroup of treeRootGroup.children) {
      if (!stepGroup.visible) continue;
      if (activeStepNum >= 1 && activeStepNum <= 6 && stepGroup.userData.stepNumber !== activeStepNum) continue;
      for (const subGroup of stepGroup.children) {
        for (const partObj of subGroup.children) {
          targetParts.push(partObj);
        }
      }
    }
    renderDebugBadgesForGroup(mainDebugLayer, targetParts, mainCamera, window.innerWidth, window.innerHeight);
  }
}

init().catch((err) => console.error("Scene init failed:", err));
requestAnimationFrame(animate);

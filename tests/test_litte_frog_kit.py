"""Verification suite for litte-frog-kit static Vercel rewrite."""
import json
import re
import threading
import unittest
import urllib.request
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT_ROOT / "public"
SRC_DIR = PUBLIC_DIR / "src"


class TestProjectConfigAndTree(unittest.TestCase):
    """Verifies Vercel configuration, state controller, and 6-step assembly tree parity."""

    def test_vercel_json_and_app_config(self):
        vercel_path = PROJECT_ROOT / "vercel.json"
        self.assertTrue(vercel_path.exists(), "vercel.json must exist")
        vercel_cfg = json.loads(vercel_path.read_text(encoding="utf-8"))
        self.assertEqual(vercel_cfg.get("name"), "litte-frog-kit")

        app_cfg_path = PUBLIC_DIR / "app-config.json"
        self.assertTrue(app_cfg_path.exists(), "public/app-config.json must exist")
        app_cfg = json.loads(app_cfg_path.read_text(encoding="utf-8"))
        self.assertEqual(app_cfg, {"debug": False})

    def test_state_controller_exports(self):
        ctrl_path = SRC_DIR / "state-controller.js"
        self.assertTrue(ctrl_path.exists(), "state-controller.js must exist")
        content = ctrl_path.read_text(encoding="utf-8")
        self.assertIn("export const TOTAL_STATES = 8", content)
        self.assertIn("export function createStateController", content)

    def test_assembly_tree_six_steps_and_subassemblies(self):
        tree_path = SRC_DIR / "assembly-tree.js"
        self.assertTrue(tree_path.exists(), "assembly-tree.js must exist")
        content = tree_path.read_text(encoding="utf-8")
        for step_num in range(1, 7):
            self.assertIn(f'"id": "step_{step_num}"', content)
        for sub_id in [
            "sub_1_skids", "sub_1_base_plates", "sub_1_rails_and_riser",
            "sub_2_smarthub", "sub_2_side_arches", "sub_2_motor",
            "sub_3_coupler", "sub_3_gear_support", "sub_3_gears_and_axle",
            "sub_4_jaw_base", "sub_4_snout",
            "sub_5_eyes", "sub_5_tail",
            "sub_6_leg_right", "sub_6_leg_left",
        ]:
            self.assertIn(f'"id": "{sub_id}"', content)
        self.assertRegex(content, r'"part":\s*"42022\.dat",\s*"color":\s*27,\s*"qty":\s*2')
        self.assertRegex(content, r'"part":\s*"42022\.dat",\s*"color":\s*43,\s*"qty":\s*2')
        self.assertIn("if (!stepNode || !Array.isArray(stepNode.children)) return [];", content)


class TestLDrawBundleCompleteness(unittest.TestCase):
    """Verifies that public/assets/ldraw-bundle.json exists, is compact, and resolves every transitive subfile."""

    def setUp(self):
        self.bundle_path = PUBLIC_DIR / "assets" / "ldraw-bundle.json"
        self.assertTrue(self.bundle_path.exists(), "public/assets/ldraw-bundle.json must exist")
        self.bundle = json.loads(self.bundle_path.read_text(encoding="utf-8"))

    def test_all_assembly_tree_parts_and_transitive_subfiles_exist_in_bundle(self):
        tree_text = (SRC_DIR / "assembly-tree.js").read_text(encoding="utf-8")
        root_parts = set(re.findall(r'"part":\s*"([^"]+)"', tree_text))
        self.assertGreaterEqual(len(root_parts), 25)

        visited = set()

        def walk(part_key: str):
            norm = part_key.replace("\\", "/").lower()
            if norm in visited:
                return
            visited.add(norm)
            self.assertIn(norm, self.bundle, f"Missing LDraw entry in bundle: {norm}")
            text = self.bundle[norm]
            self.assertNotIn("\\", text, f"Backslash found in bundled entry {norm}")
            for line in text.splitlines():
                tokens = line.strip().split(None, 14)
                if len(tokens) == 15 and tokens[0] == "1":
                    walk(tokens[14])

        for part in root_parts:
            walk(part)

        self.assertGreater(len(visited), 200, "Should recursively verify over 200 LDraw subfiles in bundle")

    def test_root_parts_preserve_title_comment_line_for_tooltips(self):
        for sample_part in ["2654a.dat", "19071.dat", "21980.dat", "98138pb007.dat"]:
            text = self.bundle[sample_part]
            first_line = text.splitlines()[0]
            self.assertTrue(first_line.startswith("0 "), f"First line of {sample_part} must be 0 <Desc>, got: {first_line}")
            self.assertGreater(len(first_line.strip()), 4)

    def test_bundle_footprint_is_lightweight(self):
        size_kb = self.bundle_path.stat().st_size / 1024.0
        self.assertLess(size_kb, 400.0, f"Expected compact bundle < 400 KB, got {size_kb:.1f} KB")


class TestSceneBuilderParityAndOptimizations(unittest.TestCase):
    """Verifies 1:1 scene builder exports plus single-bundle preloading and shared ghost material caching."""

    def setUp(self):
        self.sb_path = SRC_DIR / "ldraw-scene-builder.js"
        self.assertTrue(self.sb_path.exists(), "ldraw-scene-builder.js must exist")
        self.content = self.sb_path.read_text(encoding="utf-8")

    def test_required_exports_match_original_1_to_1(self):
        for symbol in [
            "export class LDrawPartBuilder",
            "export function extractPartTitleFromDat",
            "export function createBlenderGrid",
            "export function cloneGroupAsGhost",
            "export const DEFAULT_GHOST_OPACITY = 0.22",
            "export const ULTRA_GHOST_OPACITY = 0.08",
            "export async function buildSubassemblyDetailViews",
            "export async function buildAssemblyTreeSceneGraph",
            "export async function buildStepPartsPreviewColumn",
            "export async function buildStepSubassemblyPreviews",
            "export const buildStepPartsPreviewRow",
            "export const LDrawPartCache",
            "export const buildTreeSceneGraph",
            "export const buildStepPartsPreviewGroup",
            "export const EXTRA_LDRAW_COLORS",
            "export const MAX_RECURSION_DEPTH = 12",
            "export const ASCII_ZERO_CODE = 48",
            "export const LDRAW_CURRENT_COLOR = 16",
            "export const LDRAW_EDGE_COLOR = 24",
            "parseVertex(tokens, offset, matrix)",
        ]:
            self.assertIn(symbol, self.content)

    def test_supports_single_bundle_preload_and_shared_ghost_material_cache(self):
        self.assertIn("preloadBundle", self.content)
        self.assertIn("ldraw-bundle.json", self.content)
        self.assertIn("ghostMaterialCache", self.content)


class VisibleTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_ignored = False
        self.texts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "title"):
            self.in_ignored = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "title"):
            self.in_ignored = False

    def handle_data(self, data):
        if not self.in_ignored:
            stripped = data.strip()
            if stripped:
                self.texts.append(stripped)


class TestFrontendLayoutAndStyling(unittest.TestCase):
    def test_index_html_has_only_komponen_yang_dibuat_label_and_required_containers(self):
        index_path = PUBLIC_DIR / "index.html"
        self.assertTrue(index_path.exists(), "public/index.html must exist")
        html = index_path.read_text(encoding="utf-8")
        parser = VisibleTextExtractor()
        parser.feed(html)
        self.assertIn("Komponen Yang Dibuat", parser.texts)
        self.assertIn("Credits & Legal Notice", parser.texts)
        for required_id in [
            'id="parts-tray"',
            'id="parts-scroll-spacer"',
            'id="parts-canvas"',
            'id="main-canvas"',
            'id="subassembly-bar"',
            'id="subassembly-canvas"',
            'id="subassembly-detail-panel"',
            'id="detail-top-canvas"',
            'id="detail-bottom-canvas"',
            'id="part-tooltip"',
            'id="info-btn"',
            'id="info-modal"',
            'id="step-dots"',
        ]:
            self.assertIn(required_id, html)


    def test_styles_css_uses_f8f9fa_courier_new_hidden_scrollbar_and_right_detail_panel(self):
        css_path = PUBLIC_DIR / "styles.css"
        self.assertTrue(css_path.exists(), "public/styles.css must exist")
        css = css_path.read_text(encoding="utf-8")
        self.assertIn("#f8f9fa", css.lower())
        self.assertIn("Courier New", css)
        self.assertIn("scrollbar-width: none", css)
        self.assertIn("::-webkit-scrollbar", css)
        self.assertIn("#subassembly-detail-panel", css)
        self.assertRegex(css, r"#parts-tray\s*\{[^}]*left:\s*\d+px")
        self.assertRegex(css, r"#parts-tray\s*\{[^}]*background:\s*transparent")

    def test_main_js_wires_bundle_preload_lazy_detail_and_1_to_1_controls(self):
        main_path = SRC_DIR / "main.js"
        self.assertTrue(main_path.exists(), "public/src/main.js must exist")
        content = main_path.read_text(encoding="utf-8")
        for expected in [
            "preloadBundle",
            "createBlenderGrid",
            "buildStepPartsPreviewColumn",
            "buildStepSubassemblyPreviews",
            "buildSubassemblyDetailViews",
            "subassembly-detail-panel",
            "parts-scroll-spacer",
            "/app-config.json",
            "setViewOffset",
            "Raycaster",
        ]:
            self.assertIn(expected, content)


class TestStaticServerIntegration(unittest.TestCase):
    """Proves that litte-frog-kit/public works on a standard static file server (like Vercel CDN) with zero Python custom handlers."""

    @classmethod
    def setUpClass(cls):
        handler = partial(SimpleHTTPRequestHandler, directory=str(PUBLIC_DIR))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=1.0)

    def test_serves_static_index_config_and_ldraw_bundle(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/") as res:
            self.assertEqual(res.status, 200)
            html = res.read().decode("utf-8")
            self.assertIn("main-canvas", html)

        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/app-config.json") as res:
            self.assertEqual(res.status, 200)
            cfg = json.loads(res.read().decode("utf-8"))
            self.assertEqual(cfg, {"debug": False})

        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/assets/ldraw-bundle.json") as res:
            self.assertEqual(res.status, 200)
            bundle = json.loads(res.read().decode("utf-8"))
            self.assertIn("19071.dat", bundle)
            self.assertIn("98138pb007.dat", bundle)


if __name__ == "__main__":
    unittest.main()

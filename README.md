# Little Frog Kit (`litte-frog-kit`)

An interactive, lightweight, zero-build 3D assembly viewer for the LEGO® WeDo 2.0 Little Frog model (Lesson 06), designed to run smoothly on modern web browsers and Vercel edge CDN.

🔗 **Live Deployment:** [https://litte-frog-kit.vercel.app](https://litte-frog-kit.vercel.app)

---

## Features

- **Zero-Build Vanilla Architecture**: ES2022 modules + Three.js 0.164.1 via CDN importmap.
- **Ultra-Lightweight Footprint**: Pre-packs 28 root parts and 204 transitive subparts into a single `ldraw-bundle.json` (~288 KB raw, ~55 KB gzipped).
- **Smooth 3D Assembly Views**:
  - Main 3D viewport with Blender-style floor grid, orbit controls, and step drop animations.
  - Left vertical scrollable tray for step inventory parts.
  - Bottom rotating strip for assembled subassemblies.
  - Right-side inspect panel for detailed subassembly hierarchy and individual unit pieces.
- **Legal & Attribution Modal**: Corner info button (ⓘ) displaying official disclaimers and open-source licenses.

---

## Local Development & Testing

Run local static server:
```bash
python3 -m http.server 8123 --directory public
```

Run test suite:
```bash
python3 -m unittest discover -s tests -v
```

Re-pack LDraw bundle (if adding new parts):
```bash
python3 scripts/pack_ldraw_bundle.py
```

---

## Disclaimer & Legal Notice

LEGO® and WeDo® are trademarks of the LEGO Group of companies which does not sponsor, authorize, or endorse this site. This web application is an independent, non-commercial educational tool created strictly for learning purposes.

---

## 3D Parts Attribution

3D brick geometries (`ldraw-bundle.json`) are provided by the LDraw™ Parts Library under the Creative Commons Attribution License 2.0 (CC BY 2.0). LDraw™ is a trademark owned and licensed by the Estate of James Jessiman.

---

## License

- Application code is licensed under the [MIT License](./LICENSE).
- 3D LDraw geometry data is licensed under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/).
- For full legal notices and community attributions, see [NOTICE.md](./NOTICE.md).

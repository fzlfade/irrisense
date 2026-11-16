import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prototipe 3D disajikan Express di laptop; untuk situs statis (Vercel) berkasnya ikut ke public/
// dengan jalur yang sama seperti di backend, jadi backend/prototipe/index.html tidak perlu diubah.
const landing = fileURLToPath(new URL("..", import.meta.url));
const repo = path.join(landing, "..");
const pub = path.join(landing, "public");
const three = path.join(landing, "node_modules", "three");

function copy(from, to) {
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to);
}

cpSync(path.join(repo, "backend", "prototipe"), path.join(pub, "prototipe"), { recursive: true });
for (const f of [
  "build/three.module.min.js",
  "examples/jsm/controls/OrbitControls.js",
  "examples/jsm/utils/BufferGeometryUtils.js",
  "examples/jsm/effects/OutlineEffect.js",
]) copy(path.join(three, f), path.join(pub, "vendor", "three", f));
copy(path.join(repo, "design", "tokens.css"), path.join(pub, "dashboard", "css", "tokens.css"));
console.log("prototipe 3D disalin ke landing/public/");

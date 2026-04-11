import { build } from "esbuild";
import fs from "fs";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const allDeps = Object.keys(pkg.dependencies || {});
const externals = allDeps.filter((dep) => dep !== "@tracksheet/shared");

// We also mark some built-ins or common problematic modules explicitly
externals.push("fsevents", "bcrypt", "better-sqlite3");

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outdir: "dist",
  platform: "node",
  target: "node22",
  format: "esm",
  external: externals,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

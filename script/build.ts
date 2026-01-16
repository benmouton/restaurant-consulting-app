import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "zod",
  "zod-validation-error",
];

// Libraries that should NOT be bundled due to dynamic requires or native modules
const forceExternal = [
  "pdf-parse",
  "exceljs",
  "papaparse",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = [
    ...allDeps.filter((dep) => !allowlist.includes(dep)),
    ...forceExternal,
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    banner: {
      js: `
// Shims for ESM compatibility in CJS bundle
const { createRequire: _createRequire } = require('module');
const { pathToFileURL } = require('url');
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = __filename;
}
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = __dirname;
}
// Create import.meta.url shim for libraries that expect it
const _importMetaUrl = pathToFileURL(__filename).href;
`,
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.url": "_importMetaUrl",
      "import.meta.dirname": "__dirname",
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

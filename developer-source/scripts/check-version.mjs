import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const constants = readFileSync(resolve(root, "src/constants.js"), "utf8");
const filesToScan = [
  "src/i18n.js",
  "README.md",
  "VALIDATION.md",
  "ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md",
  "APP_REGISTRATION_AND_TENANT_SETUP.md",
  "LICENSE.md",
  "CHANGELOG.md",
  "TROUBLESHOOTING.md"
];

const failures = [];
if (packageJson.version !== "1.0.0") failures.push(`package.json must remain 1.0.0 (found ${packageJson.version}).`);
if (!/APP_VERSION\s*=\s*"1\.0"/.test(constants)) failures.push('APP_VERSION must remain "1.0".');

const forbiddenPatterns = [
  /\bv1\.(?!0\b)\d+(?:\.\d+)?\b/gi,
  /\b(?:version|versión)\s+1\.(?!0(?:\.0)?\b)\d+(?:\.\d+)?\b/gi
];
for (const relativePath of filesToScan) {
  const content = readFileSync(resolve(root, relativePath), "utf8");
  const matches = forbiddenPatterns.flatMap(pattern => [...content.matchAll(pattern)].map(match => match[0]));
  if (matches.length) failures.push(`${relativePath} contains unexpected public version(s): ${[...new Set(matches)].join(", ")}.`);
}

if (failures.length) {
  console.error("Version policy check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Version policy check passed: public v1.0 / package 1.0.0.");

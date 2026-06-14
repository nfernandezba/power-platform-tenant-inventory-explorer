import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

describe("UX layout regressions", () => {
  it("keeps the Spanish and English flags in the language switcher", () => {
    expect(appSource).toContain("function flagEs()");
    expect(appSource).toContain("function flagEn()");
    expect(appSource).toContain("${flagEs()}<span>ES</span>");
    expect(appSource).toContain("${flagEn()}<span>EN</span>");
  });

  it("renders the overview download options before the KPI content", () => {
    const start = appSource.indexOf("function renderOverviewTab()");
    const end = appSource.indexOf("function renderKpis()", start);
    const overviewSource = appSource.slice(start, end);

    expect(overviewSource.indexOf("${renderExportToolbar()}")).toBeGreaterThan(-1);
    expect(overviewSource.indexOf("${renderExportToolbar()}")).toBeLessThan(overviewSource.indexOf("${renderKpis()}"));
  });
});

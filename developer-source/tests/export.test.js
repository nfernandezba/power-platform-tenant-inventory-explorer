import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoRawItems } from "../src/demo-data.js";
import { normaliseInventory } from "../src/data.js";
import { createInventoryPdf, pdfSafe } from "../src/pdf-export.js";
import { APP_VERSION, BOOKS } from "../src/constants.js";
import { translations } from "../src/i18n.js";

describe("PDF export", () => {
  it("normalises unsupported characters for built-in PDF fonts", () => {
    expect(pdfSafe("Vigencia — Nicolás · 15 ≥ 10")).toBe("Vigencia - Nicolas | 15 >= 10");
  });


  it("keeps the public version fixed at v1.0", () => {
    expect(APP_VERSION).toBe("1.0");
  });

  it("uses local book-cover assets", () => {
    expect(BOOKS.es.every(book => book.cover.startsWith("./assets/book-covers/"))).toBe(true);
    expect(BOOKS.en.every(book => book.cover.startsWith("./assets/book-covers/"))).toBe(true);
  });


  it("preserves each original book-cover aspect ratio in web and PDF thumbnails", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    const pdfSource = readFileSync(new URL("../src/pdf-export.js", import.meta.url), "utf8");
    expect(css).toContain("aspect-ratio: var(--book-ratio, .8)");
    expect(css).toContain("object-fit: contain");
    expect(pdfSource).toContain("const coverAspect = Number(book.coverAspect) || 0.8;");
    expect(pdfSource).toContain("const coverHeight = coverWidth / coverAspect;");
    expect(BOOKS.es[1].coverAspect).toBeCloseTo(1414 / 2000, 6);
    expect(BOOKS.en[1].coverAspect).toBeCloseTo(1414 / 2000, 6);
  });


  it("uses unique original-A4 filenames for the Copilot Studio covers", () => {
    expect(BOOKS.es[1].cover).toContain("copilot-studio-coe-es-original-a4.jpg");
    expect(BOOKS.en[1].cover).toContain("copilot-studio-coe-en-original-a4.jpg");
  });

  it("embeds book-cover images in the PDF when provided", () => {
    const items = normaliseInventory(demoRawItems);
    const coverPaths = [
      new URL("../public/assets/book-covers/coe-power-platform-es.jpg", import.meta.url),
      new URL("../public/assets/book-covers/copilot-studio-coe-es-original-a4.jpg", import.meta.url)
    ];
    const bookCoverData = coverPaths.map(path => `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`);
    const plain = createInventoryPdf(items, { language: "es", strings: translations.es });
    const withCovers = createInventoryPdf(items, { language: "es", strings: translations.es, bookCoverData });
    expect(withCovers.output("arraybuffer").byteLength).toBeGreaterThan(plain.output("arraybuffer").byteLength + 10_000);
  });

  it("creates a multi-page executive inventory report", () => {
    const items = normaliseInventory(demoRawItems);
    const doc = createInventoryPdf(items, {
      language: "es",
      strings: translations.es,
      allItemsCount: items.length,
      accountName: "demo.admin@contoso.com",
      tenantId: "11111111-2222-4333-8444-555555555555",
      lastRefreshAt: new Date("2026-06-14T12:00:00Z"),
      now: new Date("2026-06-14T12:00:00Z")
    });

    const buffer = doc.output("arraybuffer");
    expect(buffer.byteLength).toBeGreaterThan(10_000);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(5);
  });
});

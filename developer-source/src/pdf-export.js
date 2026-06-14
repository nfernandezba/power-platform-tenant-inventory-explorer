import { jsPDF } from "jspdf";
import { APP_NAME, APP_VERSION, BOOKS, LINKEDIN_URL } from "./constants.js";
import { calculateMetrics, getTenantGovernanceHighlights } from "./data.js";
import { formatDate, truncateMiddle } from "./helpers.js";

const PDF_DETAIL_LIMIT = 250;

function dateForFilename() {
  return new Date().toISOString().slice(0, 10);
}

export function pdfSafe(value) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, "->")
    .replace(/·/g, "|")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function hexRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function countBy(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const key = selector(item) || "-";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
}

function getPdfStrings(language, strings) {
  const fallback = language === "es" ? {
    title: "Reporte ejecutivo de inventario del tenant",
    subtitle: "Power Platform y Copilot Studio",
    generated: "Generado el",
    preparedBy: "Preparado por Nico Fernandez",
    executiveSummary: "Resumen ejecutivo",
    summaryText: "Este reporte presenta una vista consolidada del inventario recuperado mediante Power Platform Inventory API. Los indicadores se calculan sobre los registros incluidos en el alcance actual del reporte.",
    scope: "Alcance del reporte",
    selectedRecords: "Registros incluidos",
    tenantRecords: "Recursos informados por el resumen",
    signedInUser: "Usuario conectado",
    tenantId: "Tenant ID",
    lastRefresh: "Ultima actualizacion",
    kpis: "Indicadores principales",
    governance: "Senales de gobierno",
    adminSources: "Gobierno, DLP y configuracion de entorno",
    tenantGovernance: "Tenant Governance",
    dlpPolicies: "DLP Policies",
    environmentSettings: "Environment Settings",
    loadedSettings: "Configuraciones cargadas",
    policies: "Politicas",
    blockedPolicies: "Politicas con conectores bloqueados",
    distribution: "Distribucion por tipo de recurso",
    topEnvironments: "Principales entornos",
    topRegions: "Distribucion por region",
    appendix: "Anexo de inventario",
    appendixNote: `El anexo incluye hasta ${PDF_DETAIL_LIMIT} registros de la vista filtrada y ordenada. Utilice la exportacion CSV para obtener el detalle completo.`,
    limitations: "Acerca de los datos y sus limitaciones",
    books: "Profundiza el modelo con estos libros",
    booksCopy: "Continua desarrollando tu Centro de Excelencia, la estrategia de Power Platform y el gobierno de Copilot Studio.",
    viewAmazon: "Ver en Amazon",
    linkedin: "LinkedIn de Nico Fernandez",
    reportFooter: `CoE Toolkit | Nico Fernandez | v${APP_VERSION}`,
    totalResources: "Total de recursos",
    noRows: "No hay registros para incluir en el anexo.",
    truncated: "El anexo fue limitado para mantener el reporte manejable.",
    activeFilters: "Vista filtrada",
    columnName: "Nombre",
    columnType: "Tipo",
    columnEnvironment: "Entorno",
    columnRegion: "Region",
    columnOwner: "Owner",
    columnModified: "Modificado",
    columnStatus: "Estado",
    active: "Activo",
    quarantined: "Cuarent."
  } : {
    title: "Executive tenant inventory report",
    subtitle: "Power Platform and Copilot Studio",
    generated: "Generated on",
    preparedBy: "Prepared by Nico Fernandez",
    executiveSummary: "Executive summary",
    summaryText: "This report provides a consolidated view of inventory retrieved through Power Platform Inventory API. Indicators are calculated using the records included in the current report scope.",
    scope: "Report scope",
    selectedRecords: "Records included",
    tenantRecords: "Tenant resources reported by summary",
    signedInUser: "Signed-in user",
    tenantId: "Tenant ID",
    lastRefresh: "Last refresh",
    kpis: "Key indicators",
    governance: "Governance signals",
    adminSources: "Governance, DLP, and environment configuration",
    tenantGovernance: "Tenant Governance",
    dlpPolicies: "DLP Policies",
    environmentSettings: "Environment Settings",
    loadedSettings: "Settings loaded",
    policies: "Policies",
    blockedPolicies: "Policies with blocked connectors",
    distribution: "Distribution by resource type",
    topEnvironments: "Top environments",
    topRegions: "Distribution by region",
    appendix: "Inventory appendix",
    appendixNote: `The appendix includes up to ${PDF_DETAIL_LIMIT} records from the filtered and sorted view. Use the CSV export for the complete detailed dataset.`,
    limitations: "About the data and its limitations",
    books: "Take the model further with these books",
    booksCopy: "Continue developing your Center of Excellence, Power Platform strategy, and Copilot Studio governance.",
    viewAmazon: "View on Amazon",
    linkedin: "Nico Fernandez on LinkedIn",
    reportFooter: `CoE Toolkit | Nico Fernandez | v${APP_VERSION}`,
    totalResources: "Total resources",
    noRows: "There are no records to include in the appendix.",
    truncated: "The appendix was limited to keep the report manageable.",
    activeFilters: "Filtered view",
    columnName: "Name",
    columnType: "Type",
    columnEnvironment: "Environment",
    columnRegion: "Region",
    columnOwner: "Owner",
    columnModified: "Modified",
    columnStatus: "Status",
    active: "Active",
    quarantined: "Quarant."
  };
  return { ...fallback, ...(strings?.pdf ?? {}) };
}

function displayType(item, strings) {
  return strings?.[item.typeKey] ?? item.typeKey ?? item.type ?? "Unknown";
}

function imageElementToPng(image) {
  return new Promise((resolve, reject) => {
    if (!image) {
      resolve(null);
      return;
    }
    const convert = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 750;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    if (image.complete && image.naturalWidth) convert();
    else {
      image.addEventListener("load", convert, { once: true });
      image.addEventListener("error", reject, { once: true });
    }
  });
}

export async function getBrandLogoPng() {
  if (typeof document === "undefined") return null;
  const image = document.querySelector(".brand-logo") ?? document.querySelector(".hero-logo");
  return imageElementToPng(image).catch(() => null);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image conversion failed.")), { once: true });
    reader.readAsDataURL(blob);
  });
}

async function loadLocalImageDataUrl(path) {
  if (typeof document === "undefined" || typeof fetch === "undefined" || typeof FileReader === "undefined") return null;
  const url = new URL(path, document.baseURI).href;
  const response = await fetch(url, { cache: "force-cache", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Could not load image asset (${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The book-cover asset is not an image.");
  return blobToDataUrl(blob);
}

export async function getBookCoverData(language = "en") {
  const books = BOOKS[language] ?? BOOKS.en;
  return Promise.all(books.map(book => loadLocalImageDataUrl(book.cover).catch(() => null)));
}

export function createInventoryPdf(items, options = {}) {
  const {
    language = "en",
    strings = {},
    allItemsCount = items.length,
    summaryCounts = null,
    accountName = "-",
    tenantId = "-",
    lastRefreshAt = null,
    logoData = null,
    now = new Date(),
    tenantSettings = null,
    dlpPolicies = [],
    environmentSettings = null,
    bookCoverData = []
  } = options;

  const p = getPdfStrings(language, strings);
  const locale = strings.locale ?? (language === "es" ? "es-AR" : "en-US");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210;
  const H = 297;
  const M = 16;
  const contentW = W - (2 * M);
  const colours = {
    indigo: hexRgb("#5552B4"),
    blue: hexRgb("#3895FF"),
    teal: hexRgb("#27B8C6"),
    gold: hexRgb("#FFC000"),
    magenta: hexRgb("#BD47BD"),
    red: hexRgb("#EE0055"),
    ink: hexRgb("#0B0B0F"),
    surface: hexRgb("#16161D"),
    surface2: hexRgb("#1D1D26"),
    muted: hexRgb("#666978"),
    line: hexRgb("#D9DAE1"),
    light: hexRgb("#F4F5F7"),
    white: [255, 255, 255]
  };
  const loadedMetrics = calculateMetrics(items);
  const summaryByType = summaryCounts && typeof summaryCounts === "object" ? summaryCounts : loadedMetrics.byType;
  const summaryTotal = summaryCounts && typeof summaryCounts === "object"
    ? Object.values(summaryCounts).reduce((sum, value) => sum + (Number(value) || 0), 0)
    : loadedMetrics.total;
  const metrics = { ...loadedMetrics, total: summaryTotal, byType: summaryByType };
  const types = summaryCounts && typeof summaryCounts === "object"
    ? Object.entries(summaryCounts)
      .filter(([, count]) => Number(count) > 0)
      .map(([key, count]) => ({ label: strings?.[key] ?? key, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
    : countBy(items, item => displayType(item, strings));
  const environments = countBy(items, item => item.environmentName || item.environmentId || "-").slice(0, 10);
  const regions = countBy(items, item => item.location || "-").slice(0, 10);
  const detailedItems = items.slice(0, PDF_DETAIL_LIMIT);
  let page = 1;
  let y = 20;

  const setText = colour => doc.setTextColor(...colour);
  const setFill = colour => doc.setFillColor(...colour);
  const setDraw = colour => doc.setDrawColor(...colour);
  const wrap = (text, width) => doc.splitTextToSize(pdfSafe(text), width);

  doc.setProperties({
    title: pdfSafe(`${APP_NAME} - ${p.title}`),
    subject: pdfSafe(p.subtitle),
    author: "Nico Fernandez",
    creator: APP_NAME,
    keywords: "Power Platform, Copilot Studio, inventory, tenant, CoE"
  });

  function footer(dark = false) {
    setDraw(dark ? [55, 55, 65] : colours.line);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(dark ? [185, 188, 198] : colours.muted);
    doc.text(pdfSafe(p.reportFooter), M, H - 8);
    doc.textWithLink("linkedin.com/in/nfernandezba", W - M - 50, H - 8, { url: LINKEDIN_URL });
    doc.text(String(page), W - M, H - 8, { align: "right" });
  }

  function addPage() {
    footer();
    doc.addPage();
    page += 1;
    y = 20;
  }

  function ensure(height) {
    if (y + height > H - 20) addPage();
  }

  function section(title, accent = colours.indigo) {
    ensure(14);
    setFill(accent);
    doc.roundedRect(M, y - 4, 3, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setText(colours.ink);
    doc.text(pdfSafe(title), M + 6, y);
    y += 9;
  }

  function paragraph(text, size = 8.7, colour = colours.muted, width = contentW) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    setText(colour);
    const lines = wrap(text, width);
    doc.text(lines, M, y);
    y += lines.length * 4.1 + 3;
  }

  function labelValue(label, value, x, top, width) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    setText(colours.muted);
    doc.text(pdfSafe(label).toUpperCase(), x, top);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    setText(colours.ink);
    const lines = wrap(value || "-", width);
    doc.text(lines.slice(0, 2), x, top + 5);
  }

  function metricCard(x, top, width, label, value, accent) {
    setFill([248, 248, 251]);
    setDraw(colours.line);
    doc.roundedRect(x, top, width, 24, 3, 3, "FD");
    setFill(accent);
    doc.rect(x, top, 3, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    setText(colours.ink);
    doc.text(Number(value).toLocaleString(locale), x + 7, top + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    setText(colours.muted);
    doc.text(wrap(label, width - 12).slice(0, 2), x + 7, top + 17);
  }

  function barList(entries, maxRows = 10) {
    const selected = entries.slice(0, maxRows);
    const max = Math.max(1, ...selected.map(item => item.count));
    selected.forEach(item => {
      ensure(12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.7);
      setText(colours.ink);
      doc.text(wrap(item.label, 132).slice(0, 1), M, y);
      doc.setFont("helvetica", "bold");
      doc.text(item.count.toLocaleString(locale), W - M, y, { align: "right" });
      setFill([235, 236, 241]);
      doc.roundedRect(M, y + 2, contentW, 3.5, 1.7, 1.7, "F");
      setFill(colours.teal);
      doc.roundedRect(M, y + 2, Math.max(3, contentW * item.count / max), 3.5, 1.7, 1.7, "F");
      y += 10;
    });
  }

  // Cover
  setFill(colours.ink);
  doc.rect(0, 0, W, H, "F");
  [colours.magenta, colours.indigo, colours.blue, colours.teal, colours.gold].forEach((colour, index) => {
    setFill(colour);
    doc.rect(index * W / 5, 0, W / 5 + 0.2, 4, "F");
  });
  if (logoData) doc.addImage(logoData, "PNG", M, 18, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(colours.teal);
  doc.text("COE TOOLKIT", M, 58);
  doc.setFontSize(22);
  setText(colours.white);
  doc.text(wrap(APP_NAME, 176), M, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  setText([185, 188, 200]);
  doc.text(pdfSafe(p.title), M, 99);
  doc.setFontSize(9.5);
  setText(colours.blue);
  doc.text(pdfSafe(p.subtitle), M, 107);

  setFill(colours.surface);
  doc.roundedRect(M, 122, contentW, 73, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  setText(colours.white);
  doc.text(items.length.toLocaleString(locale), M + 13, 158);
  doc.setFontSize(11);
  setText([170, 173, 185]);
  doc.text(pdfSafe(p.selectedRecords), M + 13, 169);
  doc.setFontSize(9);
  setText(colours.teal);
  doc.text(`${pdfSafe(p.tenantRecords)}: ${Number(allItemsCount).toLocaleString(locale)}`, M + 96, 145);
  doc.text(`${pdfSafe(strings.environments ?? "Environments")}: ${Number(metrics.byType.environments ?? 0).toLocaleString(locale)}`, M + 96, 157);
  doc.text(`${pdfSafe(strings.canvasApps ?? "Canvas apps")}: ${Number(metrics.byType.canvasApps ?? 0).toLocaleString(locale)}`, M + 96, 169);
  doc.text(`${pdfSafe(strings.cloudFlows ?? "Cloud flows")}: ${Number(metrics.byType.cloudFlows ?? 0).toLocaleString(locale)}`, M + 96, 181);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  setText([175, 178, 190]);
  const generatedText = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(now);
  doc.text(`${pdfSafe(p.generated)} ${pdfSafe(generatedText)}`, M, 215);
  doc.setFont("helvetica", "bold");
  setText(colours.blue);
  doc.textWithLink(pdfSafe(p.preparedBy), M, 224, { url: LINKEDIN_URL });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  setText([175, 178, 190]);
  doc.text(wrap(strings.downloadWarning ?? "The report can contain administrative tenant information.", contentW), M, 235);
  footer(true);

  // Executive summary
  doc.addPage();
  page += 1;
  y = 22;
  section(p.executiveSummary);
  paragraph(p.summaryText);

  section(p.scope, colours.blue);
  const scopeTop = y;
  setFill([248, 248, 251]);
  setDraw(colours.line);
  doc.roundedRect(M, scopeTop - 3, contentW, 52, 3, 3, "FD");
  labelValue(p.selectedRecords, items.length.toLocaleString(locale), M + 6, scopeTop + 4, 75);
  labelValue(p.tenantRecords, Number(allItemsCount).toLocaleString(locale), M + 94, scopeTop + 4, 75);
  labelValue(p.signedInUser, accountName, M + 6, scopeTop + 21, 75);
  labelValue(p.tenantId, truncateMiddle(tenantId, 12, 8), M + 94, scopeTop + 21, 75);
  if (lastRefreshAt) labelValue(p.lastRefresh, formatDate(lastRefreshAt, locale, true), M + 6, scopeTop + 38, 150);
  y += 58;

  section(p.kpis, colours.teal);
  const metricCards = [
    [strings.totalResources ?? p.totalResources, metrics.total, colours.indigo],
    [strings.environments ?? "Environments", metrics.byType.environments ?? 0, colours.blue],
    [strings.canvasApps ?? "Canvas apps", metrics.byType.canvasApps ?? 0, colours.teal],
    [strings.modelDrivenApps ?? "Model-driven apps", metrics.byType.modelDrivenApps ?? 0, colours.indigo],
    [strings.cloudFlows ?? "Cloud flows", metrics.byType.cloudFlows ?? 0, colours.blue],
    [strings.copilotAgents ?? "Copilot Studio agents", metrics.byType.copilotAgents ?? 0, colours.magenta]
  ];
  const cardWidth = (contentW - 10) / 3;
  metricCards.forEach((card, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    metricCard(M + col * (cardWidth + 5), y + row * 29, cardWidth, card[0], card[1], card[2]);
  });
  y += 64;

  section(p.governance, colours.magenta);
  const signalCards = [
    [strings.defaultEnvironment ?? "Default environment", metrics.defaultEnvironment, colours.gold],
    [strings.missingOwner ?? "Owner not reported", metrics.missingOwner, colours.magenta],
    [strings.quarantined ?? "Quarantined", metrics.quarantined, colours.red],
    [strings.stale ?? "Not modified in 365 days", metrics.stale, colours.blue]
  ];
  const signalWidth = (contentW - 9) / 4;
  signalCards.forEach((card, index) => metricCard(M + index * (signalWidth + 3), y, signalWidth, card[0], card[1], card[2]));
  y += 32;
  footer();

  // Distribution
  doc.addPage();
  page += 1;
  y = 22;
  section(p.distribution, colours.blue);
  barList(types, 12);
  y += 3;
  section(p.topEnvironments, colours.teal);
  barList(environments, 10);
  y += 3;
  section(p.topRegions, colours.gold);
  barList(regions, 10);
  footer();

  // Optional administrative sources
  if (tenantSettings || dlpPolicies.length || environmentSettings) {
    doc.addPage();
    page += 1;
    y = 22;
    section(p.adminSources, colours.magenta);

    if (tenantSettings) {
      section(p.tenantGovernance, colours.indigo);
      const highlights = getTenantGovernanceHighlights(tenantSettings).filter(item => item.available);
      const width = (contentW - 5) / 2;
      highlights.slice(0, 8).forEach((item, index) => {
        const top = y + Math.floor(index / 2) * 21;
        const x = M + (index % 2) * (width + 5);
        setFill(item.healthy ? [238, 250, 248] : [255, 248, 231]);
        setDraw(item.healthy ? colours.teal : colours.gold);
        doc.roundedRect(x, top, width, 17, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        setText(colours.ink);
        doc.text(wrap(strings[item.labelKey] ?? item.labelKey, width - 17).slice(0, 2), x + 3, top + 5);
        doc.setFontSize(8.5);
        setText(item.healthy ? colours.teal : colours.gold);
        doc.text(pdfSafe(String(item.value)), x + width - 3, top + 9, { align: "right" });
      });
      y += Math.ceil(Math.min(8, highlights.length) / 2) * 21 + 5;
    }

    if (dlpPolicies.length) {
      section(p.dlpPolicies, colours.teal);
      const blocked = dlpPolicies.filter(policy => Number(policy.blockedCount) > 0).length;
      const cardW = (contentW - 10) / 3;
      metricCard(M, y, cardW, p.policies, dlpPolicies.length, colours.indigo);
      metricCard(M + cardW + 5, y, cardW, p.blockedPolicies, blocked, colours.teal);
      metricCard(M + (cardW + 5) * 2, y, cardW, strings.policiesWithoutBlocked ?? "Without explicit blocks", dlpPolicies.length - blocked, colours.gold);
      y += 31;
      dlpPolicies.slice(0, 8).forEach(policy => {
        ensure(9);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        setText(colours.ink);
        doc.text(wrap(policy.displayName, 92).slice(0, 1), M, y);
        doc.setFont("helvetica", "normal");
        setText(colours.muted);
        doc.text(pdfSafe(`${policy.businessCount} business | ${policy.nonBusinessCount} non-business | ${policy.blockedCount} blocked`), W - M, y, { align: "right" });
        y += 7;
      });
      y += 3;
    }

    if (environmentSettings) {
      section(p.environmentSettings, colours.blue);
      const groupCounts = Object.entries(environmentSettings.groups ?? {}).map(([key, values]) => ({ label: strings[key] ?? key, count: values.length }));
      paragraph(`${environmentSettings.details?.displayName ?? "Environment"} | ${p.loadedSettings}: ${groupCounts.reduce((sum, item) => sum + item.count, 0)}`, 8.2);
      barList(groupCounts, 8);
    }
    footer();
  }

  // Inventory appendix
  doc.addPage();
  page += 1;
  y = 22;
  section(p.appendix, colours.indigo);
  paragraph(p.appendixNote, 8.2);
  if (items.length > PDF_DETAIL_LIMIT) paragraph(`${p.truncated} ${items.length.toLocaleString(locale)} -> ${PDF_DETAIL_LIMIT.toLocaleString(locale)}.`, 7.7, colours.red);

  const columns = [
    { key: "name", label: p.columnName, width: 40 },
    { key: "type", label: p.columnType, width: 27 },
    { key: "environment", label: p.columnEnvironment, width: 31 },
    { key: "region", label: p.columnRegion, width: 19 },
    { key: "owner", label: p.columnOwner, width: 27 },
    { key: "modified", label: p.columnModified, width: 22 },
    { key: "status", label: p.columnStatus, width: 12 }
  ];

  function tableHeader() {
    setFill(colours.ink);
    doc.rect(M, y, contentW, 8, "F");
    let x = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    setText(colours.white);
    columns.forEach(column => {
      doc.text(wrap(column.label, column.width - 2).slice(0, 1), x + 1, y + 5.2);
      x += column.width;
    });
    y += 8;
  }

  function newAppendixPage() {
    footer();
    doc.addPage();
    page += 1;
    y = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(colours.ink);
    doc.text(pdfSafe(p.appendix), M, y);
    y += 6;
    tableHeader();
  }

  tableHeader();
  if (!detailedItems.length) {
    paragraph(p.noRows);
  } else {
    detailedItems.forEach((item, index) => {
      const values = {
        name: item.displayName || item.id || "-",
        type: displayType(item, strings),
        environment: item.environmentName || item.environmentId || "-",
        region: item.location || "-",
        owner: item.ownerId ? truncateMiddle(item.ownerId, 7, 5) : "-",
        modified: formatDate(item.lastModifiedAt, locale),
        status: item.isQuarantined ? p.quarantined : p.active
      };
      const multilineKeys = new Set(["name", "type", "environment", "status"]);
      const lineSets = columns.map(column => wrap(values[column.key], column.width - 2).slice(0, multilineKeys.has(column.key) ? 2 : 1));
      const maxLines = Math.max(...lineSets.map(lines => lines.length));
      const rowHeight = Math.max(7, maxLines * 3.3 + 2.5);
      if (y + rowHeight > H - 20) newAppendixPage();
      if (index % 2 === 0) {
        setFill([248, 248, 251]);
        doc.rect(M, y, contentW, rowHeight, "F");
      }
      setDraw(colours.line);
      doc.line(M, y + rowHeight, W - M, y + rowHeight);
      let x = M;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.3);
      setText(colours.ink);
      columns.forEach((column, columnIndex) => {
        doc.text(lineSets[columnIndex], x + 1, y + 4.2);
        x += column.width;
      });
      y += rowHeight;
    });
  }
  footer();

  // Limitations and books CTA
  doc.addPage();
  page += 1;
  y = 22;
  section(p.limitations, colours.gold);
  (strings.limitations ?? []).forEach(item => {
    const lines = wrap(`- ${item}`, contentW - 2);
    ensure(lines.length * 4 + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.1);
    setText(colours.muted);
    doc.text(lines, M + 2, y);
    y += lines.length * 4 + 3;
  });

  section(p.books, colours.magenta);
  paragraph(p.booksCopy, 8.5);
  const books = BOOKS[language] ?? BOOKS.en;
  books.forEach((book, index) => {
    const cardHeight = 43;
    const coverWidth = 22;
    const coverHeight = 31;
    ensure(cardHeight + 7);
    const top = y;
    const coverX = M + 6;
    const coverY = top + 2;
    const textX = M + 34;
    setFill(index % 2 === 0 ? [249, 247, 250] : [246, 249, 251]);
    setDraw(colours.line);
    doc.roundedRect(M, top - 3, contentW, cardHeight, 3, 3, "FD");

    const coverData = bookCoverData[index];
    if (coverData) {
      setFill([223, 224, 230]);
      doc.roundedRect(coverX + 1.2, coverY + 1.2, coverWidth, coverHeight, 1.2, 1.2, "F");
      const imageFormat = String(coverData).startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(coverData, imageFormat, coverX, coverY, coverWidth, coverHeight, `book-cover-${language}-${index}`, "FAST");
      setDraw(colours.line);
      doc.rect(coverX, coverY, coverWidth, coverHeight);
      doc.link(coverX, coverY, coverWidth, coverHeight, { url: book.url });
    } else {
      setFill(index % 2 === 0 ? colours.indigo : colours.teal);
      doc.roundedRect(coverX, coverY, coverWidth, coverHeight, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.4);
      setText(colours.white);
      doc.text(wrap("COE BOOK", coverWidth - 5), coverX + 2.5, coverY + 9);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    setText(colours.ink);
    doc.text(wrap(book.title, 111).slice(0, 3), textX, top + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    setText(colours.muted);
    doc.text(pdfSafe(book.author), textX, top + 25);
    doc.setFont("helvetica", "bold");
    setText(colours.blue);
    doc.textWithLink(pdfSafe(p.viewAmazon), textX, top + 32, { url: book.url });
    y += cardHeight + 5;
  });

  ensure(28);
  setFill(colours.ink);
  doc.roundedRect(M, y, contentW, 24, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(colours.white);
  doc.text(pdfSafe(p.linkedin), M + 7, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(colours.blue);
  doc.textWithLink("linkedin.com/in/nfernandezba", M + 7, y + 17, { url: LINKEDIN_URL });
  footer();

  return doc;
}

export async function exportPdf(items, options = {}) {
  const language = options.language ?? "en";
  const [logoData, bookCoverData] = await Promise.all([
    options.logoData ?? getBrandLogoPng(),
    options.bookCoverData ?? getBookCoverData(language)
  ]);
  const doc = createInventoryPdf(items, { ...options, language, logoData, bookCoverData });
  doc.save(`power-platform-inventory-report-${dateForFilename()}.pdf`);
}

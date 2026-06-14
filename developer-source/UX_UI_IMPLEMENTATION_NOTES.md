# UX/UI implementation notes

## Scope

This update implements the UX/UI recommendations identified during the review of Power Platform Tenant Inventory Explorer. The public application and package versions remain fixed at **v1.0 / 1.0.0**.

## Implemented changes

### Translation and terminology

- Completed the generic Spanish navigation labels: **Resumen**, **Entornos**, **Recursos**, and **Políticas DLP**.
- Kept Spanish and English translation dictionaries aligned and added an automated parity test.
- Corrected the English owner-filter meaning so it matches the Spanish functionality: name, UPN, or ID.
- Standardised Spanish wording and voseo across instructions and helper text.
- Replaced avoidable generic anglicisms while retaining official Microsoft product and technical names where appropriate.
- Restored the Spanish and English flag icons while retaining visible abbreviations and accessible language names; on very narrow screens the flags remain visible and the abbreviations are available to assistive technology.
- Moved the overview download controls to the top of the content, beside the page introduction and before KPIs, so users do not need to scroll to the bottom to export.

### Responsive and mobile-first experience

- Added dedicated mobile selectors for workspace navigation and resource categories, replacing partially hidden horizontal tab bars on narrow screens.
- Added a compact **Paso n de 3** progress treatment for mobile.
- Stacked primary actions on narrow screens and increased interactive controls towards a 44-pixel touch target.
- Increased secondary text sizes and spacing for mobile readability.
- Prevented document-level horizontal overflow.

### Resource inventory

- Added a mobile card presentation for inventory records, with the most relevant fields visible first and additional information available in context.
- Preserved the full desktop table for high-density comparison.
- Added mobile sorting and a default mobile page size of 10 records.

### Information density

- Added collapsible mobile sections for secondary content such as query controls, filters, sources, recent activity, status details, and promotional content.
- Kept key KPIs, alerts, and primary actions immediately visible.
- Reduced unnecessary vertical space in the mobile progress area and KPI layouts.

### Resilience and accessibility

- Added guarded browser-storage operations for restricted browsing environments.
- Improved accessible labels for language and navigation controls.
- Preserved keyboard and desktop interaction patterns while adding the mobile alternatives.

## Validation performed

- Automated tests: **51 passed across 8 test files**.
- Production build: completed successfully with Vite.
- Responsive rendering reviewed at **320, 390, 768, 1,024, and 1,440 px**.
- Checked representative start, overview, and resource-inventory views for page-level horizontal overflow, navigation visibility, text wrapping, and touch-target sizing.

## Main files changed

- `developer-source/src/app.js`
- `developer-source/src/styles.css`
- `developer-source/src/i18n.js`
- `developer-source/src/auth.js`
- `developer-source/src/helpers.js`
- `developer-source/tests/i18n.test.js`

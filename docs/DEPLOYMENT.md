# Deployment

## GitHub Pages

1. Upload the complete contents of this package to the repository root.
2. Keep `index.html`, `.nojekyll`, `manifest.webmanifest`, `assets/`, `docs/` and `tests/` at the paths supplied.
3. Configure GitHub Pages as `Deploy from a branch` → `main` → `/(root)`.
4. Register the final GitHub Pages URL as a **Single-page application** redirect URI in Microsoft Entra.
5. After deployment, perform a hard refresh.

## Delegated permissions

- Power Platform API: `ResourceQuery.Resources.Read`
- Power Platform API: `EnvironmentManagement.Environments.Read`
- Power Platform API: `EnvironmentManagement.Settings.Read`
- Microsoft Graph: `User.ReadBasic.All` for resolvable owner names
- Power Apps Service: `User` for live Tenant Governance and DLP administrative queries

No client secret, certificate or application permission is required.

## Sample report

The packaged sample report is available at `assets/reports/Power_Platform_Tenant_Inventory_Explorer_Sample_Report_v1.0.pdf`.

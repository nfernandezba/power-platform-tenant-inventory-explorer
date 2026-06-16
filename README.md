# Power Platform Tenant Inventory Explorer

![Version](https://img.shields.io/badge/version-v1.0-5552B4)
![Deployment](https://img.shields.io/badge/deployment-GitHub%20Pages-3895FF)
![Licence](https://img.shields.io/badge/licence-MIT-FCC004)

Read-only browser application for exploring Power Platform tenant inventory, Managed Environments, Tenant Governance, DLP policies, connectors, owners and executive reporting.

## Package layout

```text
/
├── index.html
├── README.md
├── LICENSE
├── .nojekyll
├── TEST-REPORT.md
├── manifest.webmanifest
├── assets/
│   ├── icons/
│   ├── images/
│   │   ├── books/
│   │   └── tools/
│   ├── reports/
│   │   └── Power_Platform_Tenant_Inventory_Explorer_Sample_Report_v1.0.pdf
│   ├── *.css
│   └── *.js
├── docs/
│   ├── DEPLOYMENT.md
│   └── TESTING.md
└── tests/
    ├── static-validation.json
    ├── browser-flow-results.json
    └── sample-download-results.json
```

## Test mode

Open the deployed URL with `?test=1` or `?mode=test` to load a completed demonstration dataset and the report-ready experience without Microsoft Entra authentication.

## Documentation

- [Deployment and App Registration](docs/DEPLOYMENT.md)
- [Testing and test mode](docs/TESTING.md)
- [Validation evidence](TEST-REPORT.md)

## Licence

MIT. See [LICENSE](LICENSE).

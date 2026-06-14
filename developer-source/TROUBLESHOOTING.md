# Troubleshooting guide

## Power Platform API returns HTTP 400

HTTP 400 indicates that Power Platform API rejected the submitted query specification. It is not normally caused by a missing role or expired token.

Open **Details** on the failed query card. Copy the following values before reporting the issue:

- Service error message.
- Query name.
- Endpoint.
- Correlation ID.
- Request body.

The application excludes tokens and authorisation headers from this diagnostic output.

The v1.0 compatibility build uses the Microsoft-documented summary grouped by `type` and `location`. The optional Environment ID aggregation runs independently. If only `overview-summary-by-environment` fails, the main Overview should still load.

## HTTP 401

Sign out and reconnect. Confirm that the Client ID and Tenant ID belong to the same App Registration and directory.

## HTTP 403

Confirm delegated permissions, admin consent, and that the signed-in user has Power Platform Administrator or Dynamics 365 Administrator.

## HTTP 429

Allow the built-in retry policy to complete. Load one resource type at a time rather than starting multiple large datasets.

## Redirect URI mismatch

Register the exact GitHub Pages URL as a **Single-page application** redirect URI, including the trailing slash.

## Overview works but Environment Settings fails

Add and consent:

```text
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

## Governance or DLP fails

Those sections use a separate Business Application Platform administrative surface and can fail independently because of consent, role, preview/legacy availability, CORS, or network policies.

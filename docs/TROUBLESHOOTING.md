# Troubleshooting guide

## Power Platform API returns HTTP 400

HTTP 400 indicates that Power Platform API rejected the submitted query specification. It is not normally caused by a missing role or expired token.

Open **Details** on the failed query card and retain:

- Service error message.
- Query name.
- Endpoint.
- Correlation ID.
- Request body.

The application excludes tokens and authorisation headers from this diagnostic output.

The v1.0 compatibility build orders by simple aliases before projecting nested fields and uses the Microsoft-documented summary grouped by `type` and `location`.

## Environment or resource names appear as GUIDs

This normally means one of the following:

1. The browser is still using an older JavaScript bundle.
2. IndexedDB restored rows cached before the real-tenant field-mapping fix.
3. The API did not emit `properties.displayName` for that record.

After deploying the current package:

1. Press **Ctrl + F5** on Windows or **Cmd + Shift + R** on macOS.
2. Open the application and select **Clear cache**.
3. Sign out and reconnect.
4. Refresh the Overview and reload the affected resource type.

The current build uses cache schema v3 and normally invalidates old rows automatically. A manual cache clear is still recommended after replacing an earlier build.

## The environment dropdown contains GUIDs

Refresh the environment inventory before opening Environment Settings. The selector uses the display name as its visible label and retains the environment ID only as the option value used by the API.

When a display name is genuinely absent from the API response, the GUID remains as a technical fallback.

## Environment, Created, or Modified is blank in Resources

Clear the old cache and reload the resource type. The current query projects stable top-level aliases:

```text
displayName
environmentId
createdAt
createdBy
lastModifiedAt
lastModifiedBy
ownerId
```

Some fields can still be empty when Microsoft does not emit them for that resource type. The application does not fabricate missing metadata.

## How to load connector information

For supported resources, the **Connectors** column contains a **Load** button.

1. Select **Load** on the required row.
2. The application runs a one-resource detail query.
3. A detail dialog opens while the query is running.
4. Connector IDs and operation IDs appear in the dialog when returned.
5. The table button changes to **View (N)** or **None**.

Connector inventory is available only for the resource types covered by Microsoft's connector-inventory preview. Unsupported types show **Not available**.

## PDF export warns that data is pending

This is intentional. The report can combine aggregate totals with manually loaded detailed datasets and optional administrative sources.

The dialog lists pending or partial sources and requires one of two explicit actions:

- **Continue and export**: generate the report with the data currently available.
- **Cancel export**: return to the application and load additional data.

## The Copilot Studio cover is still the previous image

The current package uses unique filenames:

```text
copilot-studio-coe-es-original-a4.jpg
copilot-studio-coe-en-original-a4.jpg
```

Upload the entire new `assets/` folder and the new `index.html`, wait for GitHub Pages deployment, then hard-refresh the browser. Do not upload only the image while retaining an older `index.html` or JavaScript bundle.

## HTTP 401

Sign out and reconnect. Confirm that the Client ID and Tenant ID belong to the same App Registration and directory.

## HTTP 403

Confirm delegated permissions, administrator consent, and that the signed-in user has Power Platform Administrator or Dynamics 365 Administrator.

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

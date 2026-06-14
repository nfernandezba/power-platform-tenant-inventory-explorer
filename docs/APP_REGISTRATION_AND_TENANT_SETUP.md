# Microsoft Entra App Registration and Tenant Setup Guide

> **Project:** Power Platform Tenant Inventory Explorer  
> **Public version:** v1.0  
> **Document languages:** English and Spanish  
> **Last reviewed:** 14 June 2026

This guide explains how to register the application in Microsoft Entra ID, configure delegated Power Platform API permissions, publish the GitHub Pages redirect URI, validate the required administrative roles, and run Power Platform Tenant Inventory Explorer against a real tenant.

The application is a static browser-based Single-Page Application (SPA). It uses Microsoft Authentication Library (MSAL) and the OAuth 2.0 authorization code flow with Proof Key for Code Exchange (PKCE). It does not require or use a client secret, certificate, stored password, application user, or proprietary backend service.

---

## Language

- [English](#english)
- [Español](#español)

---

# English

## 1. What this configuration enables

After completing this guide, authorised users can open the GitHub Pages application, enter the public Application Client ID and Directory Tenant ID, sign in through Microsoft Entra ID, and query the Power Platform tenant.

The application can access several independent data sources:

| Application area | Data source | Permission or access requirement | Required for core inventory |
|---|---|---|---|
| Overview, Resources, inventory counts | Power Platform Inventory API | `ResourceQuery.Resources.Read` delegated permission | Yes |
| Environment list and environment details | Power Platform API | `EnvironmentManagement.Environments.Read` delegated permission | Recommended |
| Environment Settings | Power Platform API | `EnvironmentManagement.Settings.Read` delegated permission | Optional |
| Tenant Governance | Legacy Business Application Platform administrative endpoint | Signed-in administrative user, runtime consent and tenant policy permitting access | Optional / best effort |
| DLP Policies | Legacy Business Application Platform administrative endpoint | Signed-in administrative user, runtime consent and tenant policy permitting access | Optional / best effort |

The core Inventory API is independent from the optional Tenant Governance and DLP requests. A failure in an optional administrative source does not prevent the core inventory from loading.

## 2. Prerequisites

Before creating the App Registration, confirm the following:

1. You can access the Microsoft Entra admin centre for the target tenant.
2. You have permission to create an App Registration. Microsoft documents **Application Developer** as the minimum directory role for registering an application, although organisational policies may require a higher role.
3. An administrator is available to grant tenant-wide consent if user consent is restricted.
4. The user who will run the inventory has one of the tenant-wide Power Platform roles required by Microsoft:
   - **Power Platform Administrator**, or
   - **Dynamics 365 Administrator**.
5. The GitHub Pages site is already published, or you know the exact URL it will use.
6. The browser and corporate network allow access to:
   - `login.microsoftonline.com`
   - `api.powerplatform.com`
   - `api.bap.microsoft.com` for optional administrative queries
   - the GitHub Pages site origin

### Recommended least-privilege model

Use a dedicated single-tenant App Registration for this tool and assign the Power Platform administrative role only to the users who need to run the assessment. The delegated application cannot access more tenant data than the signed-in user is authorised to access.

Do not create credentials for the SPA. Browser applications cannot safely protect secrets.

## 3. Determine the exact GitHub Pages redirect URI

A project site normally uses this format:

```text
https://GITHUB-USER.github.io/REPOSITORY-NAME/
```

Example:

```text
https://nfernandezba.github.io/power-platform-tenant-inventory-explorer/
```

The final `/` is important. Microsoft Entra requires the redirect URI sent during authentication to match a registered URI exactly.

To confirm the URL in GitHub:

1. Open the repository.
2. Select **Settings**.
3. Select **Pages**.
4. Copy the published site address shown by GitHub.
5. Open the address in a browser and confirm that the application loads.
6. On the connection screen, copy the redirect URI displayed by the application. Use that exact value in Microsoft Entra ID.

If a custom domain is configured later, add the custom-domain URL as an additional SPA redirect URI before using it.

## 4. Create the App Registration

1. Sign in to the Microsoft Entra admin centre in the tenant that contains the Power Platform environments.
2. Confirm the active directory from the tenant selector in the top menu.
3. Go to:

```text
Entra ID
→ App registrations
→ New registration
```

4. Enter a meaningful name, for example:

```text
Power Platform Tenant Inventory Explorer
```

5. Under **Supported account types**, select:

```text
Accounts in this organisational directory only
```

This creates a single-tenant application. It is the recommended configuration when the tool is intended only for your organisation.

6. Leave the Redirect URI field empty at this stage. It will be configured explicitly as an SPA in the next section.
7. Select **Register**.
8. On the **Overview** page, copy and securely record:
   - **Application (client) ID**
   - **Directory (tenant) ID**

These values are identifiers, not passwords. They are the two values entered in the application's connection screen.

## 5. Configure the Single-Page Application platform

1. In the App Registration, select:

```text
Manage
→ Authentication
```

2. Select **Add a platform**.
3. Select **Single-page application**.
4. Enter the exact GitHub Pages URL, including the final `/`:

```text
https://GITHUB-USER.github.io/REPOSITORY-NAME/
```

5. Select **Configure** or **Save**.
6. Confirm that the URL appears under the **Single-page application** platform, not under **Web**.

### Optional local development redirect URI

Only add this URI if the source project will be run locally with Vite:

```text
http://localhost:5173/
```

Do not add localhost when it is not required. Remove temporary redirect URIs after testing if your security policy requires a minimal production registration.

### Authentication settings that should remain disabled

For this solution:

- Do not enable **Access tokens** under implicit grant and hybrid flows.
- Do not enable **ID tokens** under implicit grant and hybrid flows.
- Do not enable **Allow public client flows**.
- Do not add a **Web** platform for the GitHub Pages URL.

The application uses the authorisation code flow with PKCE through MSAL Browser. The SPA platform configuration provides the required token-endpoint CORS support.

## 6. Remove unnecessary default permissions

A newly registered application might display Microsoft Graph `User.Read` depending on the portal experience and registration workflow. Power Platform Tenant Inventory Explorer does not call Microsoft Graph.

You may remove `User.Read` if it is present and your organisation does not require it for another reason:

1. Open **API permissions**.
2. Select the Microsoft Graph `User.Read` permission.
3. Select **Remove permission**.
4. Confirm the removal.

The application requests the OpenID Connect identity scopes `openid` and `profile` dynamically for sign-in. These do not require adding Microsoft Graph data permissions for this application.

## 7. Add the required Inventory permission

1. In the App Registration, open:

```text
Manage
→ API permissions
→ Add a permission
```

2. Select **APIs my organisation uses**.
3. Search for:

```text
Power Platform API
```

4. Select the entry whose Application ID is:

```text
8578e004-a5c6-46e7-913e-12f58912df43
```

There can be similarly named entries, so verify the GUID.

5. Select **Delegated permissions**.
6. Search for and select:

```text
ResourceQuery.Resources.Read
```

7. Select **Add permissions**.

This permission enables the application to query the `PowerPlatformResources` inventory table on behalf of the signed-in administrator.

## 8. Add the optional Environment Settings permissions

To enable the **Environment Settings** tab, add these two delegated permissions from the same **Power Platform API** resource:

```text
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

Recommended procedure:

1. Select **Add a permission** again.
2. Select **APIs my organisation uses**.
3. Open **Power Platform API** with Application ID `8578e004-a5c6-46e7-913e-12f58912df43`.
4. Select **Delegated permissions**.
5. Add:
   - `EnvironmentManagement.Environments.Read`
   - `EnvironmentManagement.Settings.Read`
6. Select **Add permissions**.

The core Overview and Resources experience can work without these optional permissions, but Environment Settings will return an authorisation error.

## 9. Grant administrative consent

Whether consent is mandatory depends on the tenant's consent policy. For a predictable administrative deployment, grant tenant-wide admin consent after adding the permissions.

1. Stay on **API permissions**.
2. Review the configured delegated permissions.
3. Select:

```text
Grant admin consent for <tenant name>
```

4. Confirm the action.
5. Select **Refresh** if required.
6. Verify that the permission status shows:

```text
Granted for <tenant name>
```

The recommended permission set is:

| API | Permission | Type | Purpose |
|---|---|---|---|
| Power Platform API | `ResourceQuery.Resources.Read` | Delegated | Required inventory queries |
| Power Platform API | `EnvironmentManagement.Environments.Read` | Delegated | Environment details and selection |
| Power Platform API | `EnvironmentManagement.Settings.Read` | Delegated | Read-only Environment Settings |

Do not add write permissions. Do not add application permissions. Do not create a client secret.

## 10. Verify the Enterprise Application configuration

Creating the App Registration also creates an Enterprise Application service principal in the tenant.

Go to:

```text
Entra ID
→ Enterprise applications
→ All applications
→ Power Platform Tenant Inventory Explorer
```

Review these settings:

### Assignment required

Under **Properties**, check **Assignment required?**

- **No:** any tenant user can authenticate, but Power Platform data is still restricted by their API permissions and administrative roles.
- **Yes:** only users or groups explicitly assigned under **Users and groups** can authenticate.

For controlled administrative use, either approach is valid. If **Yes** is selected, assign the Power Platform administrators who will use the tool.

### Visible to users

**Visible to users?** controls whether the application appears in My Apps. It does not determine whether the GitHub Pages URL can authenticate. Enable it only if this is useful for your organisation.

### Enabled for users to sign in

Confirm that **Enabled for users to sign in?** is set to **Yes**.

## 11. Assign or activate the required Power Platform role

Microsoft states that Power Platform inventory requires one of these tenant-wide roles:

- Power Platform Administrator
- Dynamics 365 Administrator

Assign the role to each user who must access the full tenant inventory, or activate the role through Microsoft Entra Privileged Identity Management before running the tool.

A Global Administrator may be able to perform many administrative tasks, but the documented inventory access requirement specifically names Power Platform Administrator or Dynamics 365 Administrator. Use one of those roles for predictable results.

Role activation and API consent are separate controls:

- The App Registration permission allows the client application to request the API scope.
- Admin consent authorises that permission in the tenant.
- The signed-in user's Power Platform role determines what tenant data the API returns.

## 12. Review Conditional Access and browser access

The application is a browser SPA, so Conditional Access policies can affect both sign-in and API token acquisition.

Review policies covering:

- The custom Enterprise Application.
- Power Platform API.
- Microsoft Azure Management, because Power Platform inventory uses Azure Resource Graph internally.
- Browser access.
- MFA.
- Compliant device requirements.
- Approved client app requirements.
- Sign-in risk and user risk.
- Named locations.

A policy that permits the initial application sign-in but blocks the downstream Power Platform API can produce a successful login followed by failed inventory queries.

Also confirm that corporate proxies, secure web gateways, browser extensions, and content filters allow cross-origin HTTPS requests from the GitHub Pages origin to Microsoft API endpoints.

## 13. Optional Tenant Governance and DLP access

The **Tenant Governance** and **DLP Policies** tabs use legacy Business Application Platform administrative endpoints under:

```text
https://api.bap.microsoft.com
```

They are deliberately loaded only when the user selects their load action.

Important considerations:

1. The application requests a delegated token for the BAP resource at runtime.
2. Microsoft documents the tenant-settings endpoint as preview.
3. DLP and tenant settings are separate from the core Inventory API.
4. Access is evaluated using the signed-in user's administrative scope and the tenant's consent and Conditional Access policies.
5. A Power Platform service administrator has broader tenant access than an environment administrator; environment administrators can only see data within their administrative scope.
6. These legacy endpoints can be more sensitive to consent, service-principal provisioning, CORS, and tenant policy differences.
7. A failure in DLP or Tenant Governance does not mean the Inventory App Registration is incorrectly configured if Overview and Resources work.

No additional write permission is required or requested by the application. The tool is read-only.

## 14. Run the application against the tenant

1. Open the published GitHub Pages URL.
2. Confirm that the footer or header displays public version **v1.0**.
3. In **Application Client ID**, paste the **Application (client) ID** copied from the App Registration.
4. In **Directory Tenant ID**, paste the **Directory (tenant) ID**.
5. Optionally select **Remember configuration**.
   - This stores only the Client ID and Tenant ID locally.
   - It does not store a password or client secret.
6. Select **Connect to tenant**.
7. Choose an account in the target tenant.
8. Complete MFA and Conditional Access requirements.
9. Review the consent prompt if one appears.
10. After redirection, confirm that the application identifies the signed-in account.

The application initially runs lightweight bootstrap queries for:

- Aggregated inventory totals.
- Environments and environment groups.
- Recently changed resources.

Detailed resource records are loaded manually by type to reduce timeouts and throttling.

## 15. Validate each application area

### Overview

Expected result:

- Resource totals appear.
- Environment and environment-group counts appear.
- Region and resource-type distributions appear.
- Query Centre shows successful bootstrap query states.

If Overview fails with `401` or `403`, check `ResourceQuery.Resources.Read`, admin consent, the signed-in user's Power Platform role, and Conditional Access.

### Environments

Expected result:

- Tenant environments appear.
- Environment types, regions, management status and resource counts appear when returned by the API.

If environment details fail while Overview works, confirm `EnvironmentManagement.Environments.Read`.

### Resources

Expected result:

- Each resource-type tab shows the aggregated expected count.
- **Load first 1,000** retrieves the first page for that resource type.
- **Load next 1,000** and **Load all remaining** are available when more pages exist.

The API uses Azure Resource Graph pagination and can return a `skipToken` for subsequent pages.

### Tenant Governance

Expected result:

- The tab remains unloaded until the user explicitly starts it.
- An additional Microsoft consent or authentication popup might appear.
- Returned settings are displayed with their raw property path and an advisory assessment.

The endpoint is preview and may behave differently across tenants.

### DLP Policies

Expected result:

- The tab remains unloaded until the user explicitly starts it.
- Policies and connector groups appear when the signed-in user has the required administrative scope.

DLP interpretation must consider policy scope and the default connector group; an omitted connector must not automatically be treated as blocked or safe.

### Environment Settings

Expected result:

1. Select an environment.
2. Load its settings.
3. Environment details and management settings are requested independently.
4. Available results remain visible if only one of the two requests succeeds.

Confirm both environment permissions when this tab returns `403`.

## 16. Recommended acceptance test

Perform this validation after the first deployment:

1. Open the application in an InPrivate/Incognito browser window.
2. Connect using the new Client ID and Tenant ID.
3. Confirm that the Microsoft sign-in request displays the correct application name.
4. Verify Overview counts against Power Platform admin centre > Manage > Inventory.
5. Load the first 1,000 Canvas apps.
6. Load the first 1,000 cloud flows.
7. Load the first 1,000 Copilot Studio agents.
8. Open Environments and select a known environment.
9. Load Environment Settings.
10. Load Tenant Governance.
11. Load DLP Policies.
12. Export CSV, JSON and PDF.
13. Confirm that the PDF displays the book-cover images.
14. Sign out.
15. On a shared device, select **Clear cache** to remove locally cached tenant inventory.

Record which optional endpoints work in the target tenant. A successful core inventory test should not be marked as failed solely because a preview or legacy endpoint is unavailable.

## 17. Security verification checklist

Before releasing the URL to administrators, verify:

- [ ] The App Registration is single-tenant.
- [ ] The GitHub Pages URL is registered as **Single-page application**.
- [ ] The redirect URI matches exactly and includes the trailing `/`.
- [ ] No client secret exists.
- [ ] No certificate credential exists.
- [ ] Implicit grant access tokens are disabled.
- [ ] Implicit grant ID tokens are disabled.
- [ ] Public client flow is disabled.
- [ ] Only delegated read permissions are configured.
- [ ] `ResourceQuery.Resources.Read` is present.
- [ ] Environment read permissions are present when Environment Settings is required.
- [ ] Admin consent status is confirmed.
- [ ] Users have Power Platform Administrator or Dynamics 365 Administrator.
- [ ] Enterprise Application user assignment is configured intentionally.
- [ ] Conditional Access has been tested.
- [ ] The application is served over HTTPS.
- [ ] The public version remains v1.0.

## 18. Troubleshooting

### `AADSTS50011`: redirect URI mismatch

Cause: the redirect URI used by the browser does not exactly match a registered URI.

Check:

- `https` versus `http`.
- GitHub username.
- Repository name and capitalisation.
- Custom domain versus `github.io` domain.
- Final `/`.
- The URL is under **Single-page application**, not **Web**.

Copy the exact URI displayed by the application's connection screen and register it.

### `AADSTS65001`, consent required, or needs admin approval

Cause: the delegated permissions have not been consented to under the tenant's consent policy.

Resolution:

1. Open App Registration > API permissions.
2. Select **Grant admin consent for the tenant**.
3. Confirm the status is granted.
4. Sign out and retry in a private browser window.

### Power Platform API does not appear in the API picker

Search using the Application ID:

```text
8578e004-a5c6-46e7-913e-12f58912df43
```

Microsoft notes that the Power Platform API service principal might not yet exist in some tenants. It is not necessary to expose your own API or create a second App Registration.

When no Azure subscription is available, an Entra administrator can provision the Microsoft-owned service principal through Microsoft Graph Explorer:

1. Sign in to Graph Explorer with the target tenant account and make sure sample data is disabled.
2. Consent `Application.ReadWrite.All` to Graph Explorer. This permission is for Graph Explorer only; do not add it to Tenant Inventory Explorer.
3. Send `POST https://graph.microsoft.com/v1.0/servicePrincipals` with this request body:

```json
{
  "appId": "8578e004-a5c6-46e7-913e-12f58912df43"
}
```

4. A successful response is `201 Created` and returns a service principal named **Power Platform API**.
5. Verify it with:

```http
GET https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '8578e004-a5c6-46e7-913e-12f58912df43'&$select=id,appId,displayName
```

6. Return to the App Registration, open **API permissions > Add a permission > APIs my organisation uses**, search by the GUID, and add the delegated permissions.
7. Review or revoke Graph Explorer's temporary `Application.ReadWrite.All` consent when the administrative operation is complete.

The user performing the POST must also hold an appropriate Entra role, such as Application Administrator or Cloud Application Administrator.

### `AADSTS500011`: resource principal not found

This can occur when the requested Microsoft resource service principal is not provisioned or consented in the tenant, particularly for an optional BAP request.

Confirm:

- The Tenant ID is correct.
- The resource URL in the error is expected.
- The Power Platform API enterprise application exists.
- Admin consent has been granted.
- The error applies to `api.powerplatform.com` or only to optional `api.bap.microsoft.com` queries.

### Login succeeds but inventory returns `401`

Likely causes:

- Token acquisition failed for the Power Platform API.
- The app is requesting a scope that was not configured.
- The session contains a stale token from before permissions were granted.

Resolution:

1. Sign out.
2. Clear site data or use an InPrivate window.
3. Verify the configured permission.
4. Grant admin consent.
5. Sign in again.

### Inventory returns `403 Forbidden`

Likely causes:

- The signed-in user lacks Power Platform Administrator or Dynamics 365 Administrator.
- A PIM role has not been activated.
- Conditional Access blocks the downstream API.
- Environment Settings permissions are missing for that specific tab.

### User is not assigned to a role for the application

The Enterprise Application has **Assignment required?** set to **Yes**.

Either:

- assign the user or an appropriate security group under **Users and groups**, or
- deliberately set **Assignment required?** to **No**.

### Popup blocked when loading governance, DLP or settings

The optional datasets use an interactive popup when additional consent is required. Allow popups for the GitHub Pages origin and retry the individual query.

### Overview works but DLP or Tenant Governance fails

This is possible because the data sources are independent.

Check:

- Whether the user has tenant-wide Power Platform administrative scope.
- Whether the popup was allowed.
- Whether consent for the BAP resource was blocked.
- Whether `api.bap.microsoft.com` is allowed by the network.
- Whether the preview endpoint is available in the tenant.
- Whether the browser reports a CORS error.

Do not add a client secret to solve a browser CORS or delegated-consent issue.

### Environment Settings returns partial information

The tool deliberately uses independent requests for environment details and settings. A partial result means one endpoint succeeded and the other failed. Review the status shown for each request and verify both environment permissions.

### The page remains on an older release

Force-refresh the browser:

```text
Windows: Ctrl + F5
macOS: Cmd + Shift + R
```

Also confirm that GitHub Pages deployed the updated `index.html` and complete `assets` directory.

## 19. Removing access or decommissioning the application

To disable the tool without deleting the repository:

1. Open the Enterprise Application.
2. Set **Enabled for users to sign in?** to **No**.

To remove a user's access when assignment is required:

1. Open Enterprise Application > Users and groups.
2. Remove the user or group assignment.

To revoke tenant consent:

1. Open the Enterprise Application permissions section.
2. Review and revoke the delegated permission grant according to organisational policy.

To decommission fully:

1. Disable or delete the GitHub Pages repository/site.
2. Delete the App Registration.
3. Delete the corresponding Enterprise Application if it remains.
4. Remove local browser cache from administrative workstations.
5. Retain exported reports according to the organisation's information-retention policy.

## 20. Official references

- Register an application in Microsoft Entra ID:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app>
- Configure a single-page application:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-app-configuration>
- OAuth 2.0 authorisation code flow and SPA redirect URIs:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow>
- Redirect URI best practices:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/reply-url>
- Power Platform API authentication:  
  <https://learn.microsoft.com/en-us/power-platform/admin/programmability-authentication-v2>
- Power Platform permission reference:  
  <https://learn.microsoft.com/en-us/power-platform/admin/programmability-permission-reference>
- Power Platform inventory:  
  <https://learn.microsoft.com/en-us/power-platform/admin/power-platform-inventory>
- Power Platform Inventory API:  
  <https://learn.microsoft.com/en-us/power-platform/admin/inventory-api>
- Environment Management Settings tutorial:  
  <https://learn.microsoft.com/en-us/power-platform/admin/programmability-tutorial-environmentmanagement-settings>
- Tenant settings endpoint, preview:  
  <https://learn.microsoft.com/en-us/power-platform/admin/list-tenantsettings>
- Power Platform for Admins connector and BAP scope behaviour:  
  <https://learn.microsoft.com/en-us/connectors/powerplatformforadmins/>

---

# Español

## 1. Qué habilita esta configuración

Después de completar esta guía, los usuarios autorizados podrán abrir la aplicación publicada en GitHub Pages, introducir el Application Client ID y el Directory Tenant ID, autenticarse mediante Microsoft Entra ID y consultar el tenant de Power Platform.

La aplicación utiliza varias fuentes de datos independientes:

| Área de la aplicación | Fuente de datos | Permiso o requisito de acceso | Obligatorio para el inventario principal |
|---|---|---|---|
| Overview, Resources y recuentos | Power Platform Inventory API | Permiso delegado `ResourceQuery.Resources.Read` | Sí |
| Lista y detalle de entornos | Power Platform API | Permiso delegado `EnvironmentManagement.Environments.Read` | Recomendado |
| Environment Settings | Power Platform API | Permiso delegado `EnvironmentManagement.Settings.Read` | Opcional |
| Tenant Governance | Endpoint administrativo heredado de Business Application Platform | Usuario administrador autenticado, consentimiento en ejecución y políticas del tenant que permitan el acceso | Opcional / best effort |
| DLP Policies | Endpoint administrativo heredado de Business Application Platform | Usuario administrador autenticado, consentimiento en ejecución y políticas del tenant que permitan el acceso | Opcional / best effort |

El inventario principal es independiente de las consultas opcionales de Tenant Governance y DLP. Si una fuente administrativa opcional falla, el inventario principal puede continuar funcionando.

## 2. Requisitos previos

Antes de registrar la aplicación, confirma lo siguiente:

1. Puedes acceder al centro de administración de Microsoft Entra del tenant objetivo.
2. Tienes permisos para crear una App Registration. Microsoft documenta **Application Developer** como rol mínimo para registrar aplicaciones, aunque la política de tu organización puede exigir un rol superior.
3. Hay un administrador disponible para conceder consentimiento a nivel de tenant si el consentimiento de usuario está restringido.
4. El usuario que ejecutará el inventario tiene uno de los roles administrativos de Power Platform requeridos por Microsoft:
   - **Power Platform Administrator**, o
   - **Dynamics 365 Administrator**.
5. El sitio de GitHub Pages ya está publicado o conoces la URL exacta que utilizará.
6. El navegador y la red corporativa permiten acceder a:
   - `login.microsoftonline.com`
   - `api.powerplatform.com`
   - `api.bap.microsoft.com` para consultas administrativas opcionales
   - el origen del sitio de GitHub Pages

### Modelo de mínimo privilegio recomendado

Utiliza una App Registration dedicada y single-tenant para esta herramienta. Asigna el rol administrativo de Power Platform únicamente a las personas que deban ejecutar la evaluación.

La aplicación usa permisos delegados: no puede acceder a más información que la que el usuario autenticado tenga autorización para consultar.

No crees credenciales para la SPA. Una aplicación ejecutada en el navegador no puede proteger un secreto.

## 3. Determinar la URL exacta de redirección de GitHub Pages

Una página de proyecto suele tener este formato:

```text
https://USUARIO-GITHUB.github.io/NOMBRE-REPOSITORIO/
```

Ejemplo:

```text
https://nfernandezba.github.io/power-platform-tenant-inventory-explorer/
```

La barra final `/` es importante. Microsoft Entra exige que la redirect URI enviada durante la autenticación coincida exactamente con una URI registrada.

Para confirmar la URL en GitHub:

1. Abre el repositorio.
2. Selecciona **Settings**.
3. Selecciona **Pages**.
4. Copia la dirección publicada que muestra GitHub.
5. Ábrela en un navegador y confirma que la aplicación carga.
6. En la pantalla de conexión, copia la redirect URI que muestra la propia aplicación. Utiliza exactamente ese valor en Microsoft Entra ID.

Si posteriormente configuras un dominio personalizado, añade primero la URL del dominio como una nueva redirect URI de tipo SPA.

## 4. Crear la App Registration

1. Accede al centro de administración de Microsoft Entra dentro del tenant que contiene los entornos de Power Platform.
2. Confirma el directorio activo mediante el selector de tenant del menú superior.
3. Navega a:

```text
Entra ID
→ App registrations
→ New registration
```

4. Introduce un nombre descriptivo, por ejemplo:

```text
Power Platform Tenant Inventory Explorer
```

5. En **Supported account types**, selecciona:

```text
Accounts in this organisational directory only
```

Esta opción crea una aplicación single-tenant, recomendada cuando la herramienta se utilizará solamente dentro de tu organización.

6. Deja vacío el campo Redirect URI por el momento. Se configurará expresamente como SPA en el siguiente apartado.
7. Pulsa **Register**.
8. En la página **Overview**, copia y guarda:
   - **Application (client) ID**
   - **Directory (tenant) ID**

Estos valores son identificadores públicos, no contraseñas. Son los dos valores que introducirás en la pantalla inicial de la herramienta.

## 5. Configurar la plataforma Single-Page Application

1. Dentro de la App Registration, abre:

```text
Manage
→ Authentication
```

2. Pulsa **Add a platform**.
3. Selecciona **Single-page application**.
4. Introduce la URL exacta de GitHub Pages, incluyendo la barra final `/`:

```text
https://USUARIO-GITHUB.github.io/NOMBRE-REPOSITORIO/
```

5. Pulsa **Configure** o **Save**.
6. Comprueba que la URL aparece dentro de la plataforma **Single-page application** y no dentro de **Web**.

### Redirect URI opcional para desarrollo local

Añade esta URI únicamente si vas a ejecutar el código fuente localmente mediante Vite:

```text
http://localhost:5173/
```

No añadas localhost si no es necesario. Elimina las redirect URIs temporales después de las pruebas cuando tu política de seguridad exija una configuración de producción mínima.

### Ajustes de autenticación que deben permanecer deshabilitados

Para esta solución:

- No habilites **Access tokens** en implicit grant and hybrid flows.
- No habilites **ID tokens** en implicit grant and hybrid flows.
- No habilites **Allow public client flows**.
- No registres la URL de GitHub Pages bajo una plataforma **Web**.

La aplicación utiliza Authorization Code Flow con PKCE mediante MSAL Browser. La plataforma SPA habilita el comportamiento CORS necesario para el endpoint de tokens.

## 6. Eliminar permisos predeterminados innecesarios

Dependiendo de la experiencia del portal, una nueva App Registration puede incluir Microsoft Graph `User.Read`. Power Platform Tenant Inventory Explorer no consulta Microsoft Graph.

Puedes eliminarlo si aparece y tu organización no lo necesita por otro motivo:

1. Abre **API permissions**.
2. Selecciona el permiso Microsoft Graph `User.Read`.
3. Pulsa **Remove permission**.
4. Confirma la eliminación.

La aplicación solicita dinámicamente los scopes de identidad OpenID Connect `openid` y `profile`. No necesita permisos de datos de Microsoft Graph para iniciar sesión.

## 7. Añadir el permiso obligatorio de inventario

1. Dentro de la App Registration, abre:

```text
Manage
→ API permissions
→ Add a permission
```

2. Selecciona **APIs my organisation uses**.
3. Busca:

```text
Power Platform API
```

4. Selecciona la entrada cuyo Application ID sea:

```text
8578e004-a5c6-46e7-913e-12f58912df43
```

Puede haber entradas con nombres similares; verifica el GUID.

5. Selecciona **Delegated permissions**.
6. Busca y selecciona:

```text
ResourceQuery.Resources.Read
```

7. Pulsa **Add permissions**.

Este permiso permite consultar la tabla de inventario `PowerPlatformResources` en nombre del administrador autenticado.

## 8. Añadir los permisos opcionales de Environment Settings

Para habilitar completamente el tab **Environment Settings**, añade estos dos permisos delegados del mismo recurso **Power Platform API**:

```text
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

Procedimiento recomendado:

1. Pulsa nuevamente **Add a permission**.
2. Selecciona **APIs my organisation uses**.
3. Abre **Power Platform API** con Application ID `8578e004-a5c6-46e7-913e-12f58912df43`.
4. Selecciona **Delegated permissions**.
5. Añade:
   - `EnvironmentManagement.Environments.Read`
   - `EnvironmentManagement.Settings.Read`
6. Pulsa **Add permissions**.

El Overview y Resources pueden funcionar sin estos permisos opcionales, pero Environment Settings devolverá un error de autorización.

## 9. Conceder consentimiento administrativo

La necesidad de consentimiento depende de la política del tenant. Para un despliegue administrativo predecible, concede consentimiento a nivel de tenant después de añadir los permisos.

1. Permanece en **API permissions**.
2. Revisa los permisos delegados configurados.
3. Pulsa:

```text
Grant admin consent for <nombre del tenant>
```

4. Confirma la acción.
5. Pulsa **Refresh** cuando sea necesario.
6. Verifica que el estado muestre:

```text
Granted for <nombre del tenant>
```

El conjunto recomendado es:

| API | Permiso | Tipo | Finalidad |
|---|---|---|---|
| Power Platform API | `ResourceQuery.Resources.Read` | Delegated | Consultas obligatorias de inventario |
| Power Platform API | `EnvironmentManagement.Environments.Read` | Delegated | Lista y detalle de entornos |
| Power Platform API | `EnvironmentManagement.Settings.Read` | Delegated | Lectura de Environment Settings |

No añadas permisos de escritura. No añadas permisos de aplicación. No crees un Client Secret.

## 10. Revisar la Enterprise Application

Al crear la App Registration, Microsoft Entra crea también un Service Principal visible como Enterprise Application.

Navega a:

```text
Entra ID
→ Enterprise applications
→ All applications
→ Power Platform Tenant Inventory Explorer
```

Revisa los siguientes ajustes.

### Assignment required

En **Properties**, revisa **Assignment required?**

- **No:** cualquier usuario del tenant puede autenticarse, pero los datos continuarán limitados por sus permisos y roles administrativos.
- **Yes:** solamente podrán autenticarse los usuarios o grupos asignados en **Users and groups**.

Para un uso administrativo controlado, ambas opciones son válidas. Cuando selecciones **Yes**, asigna expresamente a los administradores de Power Platform que usarán la herramienta.

### Visible to users

**Visible to users?** determina si la aplicación aparece en My Apps. No controla si la URL de GitHub Pages puede autenticarse. Actívalo solo cuando resulte útil para tu organización.

### Enabled for users to sign in

Confirma que **Enabled for users to sign in?** está configurado en **Yes**.

## 11. Asignar o activar el rol de Power Platform necesario

Microsoft indica que el inventario de Power Platform requiere uno de estos roles a nivel de tenant:

- Power Platform Administrator
- Dynamics 365 Administrator

Asigna el rol a cada usuario que deba consultar el inventario completo o actívalo mediante Microsoft Entra Privileged Identity Management antes de ejecutar la herramienta.

Un Global Administrator puede realizar numerosas tareas administrativas, pero el requisito de acceso documentado para el inventario menciona específicamente Power Platform Administrator o Dynamics 365 Administrator. Utiliza uno de esos roles para obtener un comportamiento predecible.

El rol y el consentimiento son controles diferentes:

- El permiso de la App Registration permite que la aplicación solicite el scope de la API.
- El consentimiento administrativo autoriza ese permiso dentro del tenant.
- El rol de Power Platform del usuario determina qué información devuelve la API.

## 12. Revisar Conditional Access y acceso desde el navegador

La aplicación es una SPA ejecutada en el navegador. Las políticas de Conditional Access pueden afectar tanto al inicio de sesión como a la obtención de tokens para las APIs.

Revisa las políticas aplicables a:

- La Enterprise Application personalizada.
- Power Platform API.
- Microsoft Azure Management, porque el inventario utiliza Azure Resource Graph internamente.
- Acceso desde navegador.
- MFA.
- Requisitos de dispositivo compatible.
- Requisitos de aplicaciones cliente aprobadas.
- Riesgo de inicio de sesión y riesgo de usuario.
- Ubicaciones con nombre.

Una política puede permitir el inicio de sesión inicial y bloquear posteriormente el token de Power Platform API. En ese caso el usuario se autentica correctamente, pero las consultas fallan.

Comprueba también que proxies corporativos, secure web gateways, extensiones del navegador y filtros de contenido permitan solicitudes HTTPS cross-origin desde GitHub Pages hacia los endpoints de Microsoft.

## 13. Acceso opcional a Tenant Governance y DLP

Los tabs **Tenant Governance** y **DLP Policies** utilizan endpoints administrativos heredados de Business Application Platform bajo:

```text
https://api.bap.microsoft.com
```

Se cargan únicamente cuando el usuario pulsa la acción correspondiente.

Consideraciones importantes:

1. La aplicación solicita en ejecución un token delegado para el recurso BAP.
2. Microsoft documenta el endpoint de tenant settings como preview.
3. DLP y tenant settings son fuentes separadas del Inventory API principal.
4. El acceso depende del alcance administrativo del usuario, del consentimiento y de las políticas de Conditional Access del tenant.
5. Un Power Platform service administrator dispone de mayor alcance que un environment administrator; este último solo puede acceder a los datos incluidos en su ámbito administrativo.
6. Estos endpoints heredados pueden verse más afectados por diferencias de consentimiento, Service Principal, CORS y políticas específicas del tenant.
7. Si DLP o Tenant Governance fallan, la App Registration del inventario puede seguir estando correctamente configurada cuando Overview y Resources funcionan.

La aplicación no solicita permisos de escritura y no modifica ninguna política ni configuración.

## 14. Ejecutar la aplicación contra el tenant

1. Abre la URL publicada de GitHub Pages.
2. Confirma que la interfaz muestra la versión pública **v1.0**.
3. En **Application Client ID**, pega el **Application (client) ID**.
4. En **Directory Tenant ID**, pega el **Directory (tenant) ID**.
5. Opcionalmente selecciona **Remember configuration**.
   - Solo guarda localmente el Client ID y el Tenant ID.
   - No guarda contraseñas ni Client Secrets.
6. Pulsa **Connect to tenant**.
7. Selecciona una cuenta perteneciente al tenant objetivo.
8. Completa MFA y los requisitos de Conditional Access.
9. Revisa el consentimiento cuando aparezca.
10. Después de la redirección, confirma que la aplicación identifica la cuenta autenticada.

La aplicación ejecuta inicialmente consultas ligeras para:

- Totales agregados del inventario.
- Entornos y grupos de entornos.
- Recursos modificados recientemente.

Los registros detallados se cargan manualmente por tipo de recurso para reducir timeouts y throttling.

## 15. Validar cada área de la aplicación

### Overview

Resultado esperado:

- Aparecen los totales de recursos.
- Aparecen los recuentos de entornos y grupos.
- Aparecen distribuciones por región y tipo.
- Query Centre muestra las consultas iniciales como completadas.

Cuando Overview devuelve `401` o `403`, revisa `ResourceQuery.Resources.Read`, admin consent, el rol del usuario y Conditional Access.

### Environments

Resultado esperado:

- Aparecen los entornos del tenant.
- Se muestran tipo, región, estado de Managed Environment y recuentos cuando la API los devuelve.

Si Overview funciona pero el detalle de entornos falla, comprueba `EnvironmentManagement.Environments.Read`.

### Resources

Resultado esperado:

- Cada tab secundario muestra el recuento agregado esperado.
- **Load first 1,000** recupera la primera página.
- **Load next 1,000** y **Load all remaining** aparecen cuando existen más páginas.

La API utiliza paginación de Azure Resource Graph y devuelve `skipToken` cuando hay resultados adicionales.

### Tenant Governance

Resultado esperado:

- El tab permanece sin cargar hasta que el usuario inicia la consulta.
- Puede aparecer una ventana adicional de autenticación o consentimiento.
- Los settings se muestran con su ruta original y una evaluación orientativa.

El endpoint es preview y su comportamiento puede variar entre tenants.

### DLP Policies

Resultado esperado:

- El tab permanece sin cargar hasta iniciar la consulta.
- Las políticas y grupos de conectores aparecen cuando el usuario dispone del alcance administrativo necesario.

La interpretación debe considerar el scope de la política y el grupo predeterminado. Un conector no enumerado no debe considerarse automáticamente seguro o bloqueado.

### Environment Settings

Resultado esperado:

1. Selecciona un entorno.
2. Ejecuta la carga de settings.
3. El detalle del entorno y los management settings se solicitan de forma independiente.
4. Los resultados disponibles se mantienen visibles aunque una de las dos llamadas falle.

Confirma los dos permisos de Environment Management cuando el tab devuelve `403`.

## 16. Prueba de aceptación recomendada

Después del primer despliegue, realiza esta validación:

1. Abre la aplicación en una ventana InPrivate/Incognito.
2. Conecta utilizando el nuevo Client ID y Tenant ID.
3. Confirma que la pantalla de Microsoft muestra el nombre correcto de la aplicación.
4. Contrasta los recuentos del Overview con Power Platform admin center > Manage > Inventory.
5. Carga los primeros 1.000 Canvas apps.
6. Carga los primeros 1.000 cloud flows.
7. Carga los primeros 1.000 Copilot Studio agents.
8. Abre Environments y selecciona un entorno conocido.
9. Carga Environment Settings.
10. Carga Tenant Governance.
11. Carga DLP Policies.
12. Exporta CSV, JSON y PDF.
13. Comprueba que el PDF muestra las portadas de los libros.
14. Cierra sesión.
15. En un equipo compartido, pulsa **Clear cache** para eliminar el inventario almacenado localmente.

Documenta qué endpoints opcionales funcionan en tu tenant. Una prueba correcta del inventario principal no debe considerarse fallida únicamente porque un endpoint preview o heredado no esté disponible.

## 17. Checklist de seguridad

Antes de compartir la URL con administradores, verifica:

- [ ] La App Registration es single-tenant.
- [ ] La URL de GitHub Pages está registrada como **Single-page application**.
- [ ] La redirect URI coincide exactamente e incluye `/` al final.
- [ ] No existe Client Secret.
- [ ] No existe certificado.
- [ ] Implicit grant para access tokens está deshabilitado.
- [ ] Implicit grant para ID tokens está deshabilitado.
- [ ] Public client flow está deshabilitado.
- [ ] Solo se han configurado permisos delegados de lectura.
- [ ] Está presente `ResourceQuery.Resources.Read`.
- [ ] Los permisos de Environment Management están presentes cuando se requiere Environment Settings.
- [ ] El consentimiento administrativo está concedido.
- [ ] Los usuarios tienen Power Platform Administrator o Dynamics 365 Administrator.
- [ ] La asignación de usuarios de la Enterprise Application está configurada de manera intencionada.
- [ ] Conditional Access ha sido probado.
- [ ] La aplicación se publica mediante HTTPS.
- [ ] La versión pública continúa siendo v1.0.

## 18. Resolución de problemas

### `AADSTS50011`: redirect URI mismatch

Causa: la URI utilizada por el navegador no coincide exactamente con una URI registrada.

Comprueba:

- `https` frente a `http`.
- Usuario de GitHub.
- Nombre y mayúsculas del repositorio.
- Dominio personalizado frente a `github.io`.
- Barra final `/`.
- Que la URL esté registrada en **Single-page application**, no en **Web**.

Copia la URI exacta mostrada por la propia aplicación y regístrala.

### `AADSTS65001`, consent required o needs admin approval

Causa: los permisos delegados no tienen consentimiento según la política del tenant.

Resolución:

1. Abre App Registration > API permissions.
2. Pulsa **Grant admin consent for the tenant**.
3. Confirma que el estado figura como granted.
4. Cierra sesión y repite la prueba en una ventana privada.

### Power Platform API no aparece en el selector

Busca mediante el Application ID:

```text
8578e004-a5c6-46e7-913e-12f58912df43
```

Microsoft indica que en algunos tenants el Service Principal de Power Platform API puede no estar creado. No debes exponer tu propia API ni crear una segunda App Registration.

Cuando no dispones de una suscripción de Azure, un administrador de Entra puede aprovisionar el Service Principal propiedad de Microsoft mediante Microsoft Graph Explorer:

1. Inicia sesión en Graph Explorer con una cuenta del tenant objetivo y verifica que los datos sample estén deshabilitados.
2. Concede `Application.ReadWrite.All` a Graph Explorer. Este permiso es solo para Graph Explorer; no lo añadas a Tenant Inventory Explorer.
3. Ejecuta `POST https://graph.microsoft.com/v1.0/servicePrincipals` con este cuerpo:

```json
{
  "appId": "8578e004-a5c6-46e7-913e-12f58912df43"
}
```

4. Una respuesta correcta es `201 Created` y devuelve un Service Principal llamado **Power Platform API**.
5. Verifícalo mediante:

```http
GET https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '8578e004-a5c6-46e7-913e-12f58912df43'&$select=id,appId,displayName
```

6. Vuelve a la App Registration, abre **API permissions > Add a permission > APIs my organisation uses**, busca por el GUID y añade los permisos delegados.
7. Revisa o revoca el consentimiento temporal `Application.ReadWrite.All` de Graph Explorer una vez finalizada la operación administrativa.

El usuario que ejecuta el POST también debe tener un rol de Entra adecuado, como Application Administrator o Cloud Application Administrator.

### `AADSTS500011`: resource principal not found

Puede aparecer cuando el Service Principal del recurso solicitado no está aprovisionado o consentido, especialmente en una consulta BAP opcional.

Comprueba:

- Que el Tenant ID sea correcto.
- Que la URL del recurso indicada en el error sea la esperada.
- Que exista la Enterprise Application de Power Platform API.
- Que se haya concedido admin consent.
- Si el error afecta a `api.powerplatform.com` o solamente a consultas opcionales de `api.bap.microsoft.com`.

### El login funciona pero el inventario devuelve `401`

Posibles causas:

- No se obtuvo un token para Power Platform API.
- La aplicación solicita un scope no configurado.
- La sesión contiene un token antiguo anterior al consentimiento.

Resolución:

1. Cierra sesión.
2. Borra los datos del sitio o utiliza una ventana InPrivate.
3. Verifica el permiso configurado.
4. Concede admin consent.
5. Inicia sesión nuevamente.

### El inventario devuelve `403 Forbidden`

Posibles causas:

- El usuario no tiene Power Platform Administrator o Dynamics 365 Administrator.
- El rol PIM no está activado.
- Conditional Access bloquea la API secundaria.
- Faltan permisos de Environment Settings para ese tab concreto.

### User is not assigned to a role for the application

La Enterprise Application tiene **Assignment required?** establecido en **Yes**.

Puedes:

- asignar el usuario o un grupo de seguridad en **Users and groups**, o
- cambiar de forma intencionada **Assignment required?** a **No**.

### El navegador bloquea la ventana de DLP, Governance o Settings

Los datasets opcionales utilizan una ventana interactiva cuando se necesita consentimiento adicional. Permite popups para el origen de GitHub Pages y vuelve a ejecutar la consulta individual.

### Overview funciona pero DLP o Tenant Governance falla

Es posible porque las fuentes son independientes.

Revisa:

- Que el usuario tenga alcance administrativo de Power Platform a nivel de tenant.
- Que la ventana emergente no haya sido bloqueada.
- Que el consentimiento del recurso BAP no esté restringido.
- Que la red permita `api.bap.microsoft.com`.
- Que el endpoint preview esté disponible.
- Que la consola del navegador no muestre un error CORS.

No añadas un Client Secret para intentar resolver un problema CORS o de consentimiento delegado en el navegador.

### Environment Settings devuelve información parcial

La herramienta realiza llamadas independientes para detalle y settings. Un resultado parcial indica que una llamada funcionó y otra falló. Revisa el estado de cada llamada y verifica ambos permisos de Environment Management.

### La página continúa mostrando una versión anterior

Fuerza la actualización:

```text
Windows: Ctrl + F5
macOS: Cmd + Shift + R
```

Comprueba también que GitHub Pages haya publicado el nuevo `index.html` y la carpeta `assets` completa.

## 19. Retirar acceso o desmantelar la aplicación

Para deshabilitar temporalmente la herramienta sin borrar el repositorio:

1. Abre la Enterprise Application.
2. Establece **Enabled for users to sign in?** en **No**.

Para retirar el acceso de un usuario cuando la asignación es obligatoria:

1. Abre Enterprise Application > Users and groups.
2. Elimina la asignación del usuario o grupo.

Para revocar el consentimiento:

1. Abre la sección de permisos de la Enterprise Application.
2. Revisa y revoca el consentimiento delegado según la política de tu organización.

Para desmantelar completamente:

1. Deshabilita o elimina el sitio/repositorio de GitHub Pages.
2. Elimina la App Registration.
3. Elimina la Enterprise Application correspondiente si permanece.
4. Elimina la caché local de los equipos administrativos.
5. Conserva los informes exportados conforme a la política de retención de información.

## 20. Referencias oficiales

- Registrar una aplicación en Microsoft Entra ID:  
  <https://learn.microsoft.com/es-es/entra/identity-platform/quickstart-register-app>
- Configurar una Single-Page Application:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-app-configuration>
- OAuth 2.0 Authorization Code Flow y redirect URIs SPA:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow>
- Buenas prácticas para redirect URIs:  
  <https://learn.microsoft.com/en-us/entra/identity-platform/reply-url>
- Autenticación de Power Platform API:  
  <https://learn.microsoft.com/en-us/power-platform/admin/programmability-authentication-v2>
- Referencia de permisos de Power Platform:  
  <https://learn.microsoft.com/en-us/power-platform/admin/programmability-permission-reference>
- Inventario de Power Platform:  
  <https://learn.microsoft.com/es-es/power-platform/admin/power-platform-inventory>
- Power Platform Inventory API:  
  <https://learn.microsoft.com/es-es/power-platform/admin/inventory-api>
- Tutorial de Environment Management Settings:  
  <https://learn.microsoft.com/en-us/power-platform/admin/programmability-tutorial-environmentmanagement-settings>
- Endpoint de Tenant Settings, preview:  
  <https://learn.microsoft.com/en-us/power-platform/admin/list-tenantsettings>
- Conector Power Platform for Admins y comportamiento de BAP:  
  <https://learn.microsoft.com/en-us/connectors/powerplatformforadmins/>

---

## Repository placement

Recommended repository filename:

```text
APP_REGISTRATION_AND_TENANT_SETUP.md
```

Recommended location:

```text
repository root / APP_REGISTRATION_AND_TENANT_SETUP.md
```

A root-level Markdown file is easy to discover, renders automatically in GitHub, can be linked from `README.md`, and can be updated without rebuilding or redeploying the static application.

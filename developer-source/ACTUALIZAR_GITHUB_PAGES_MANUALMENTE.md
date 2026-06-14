# Actualización manual de GitHub Pages — v1.0

Estas instrucciones no requieren Git ni Node.js.

## Qué incluye el paquete completo

El ZIP completo contiene la aplicación compilada y toda la documentación del repositorio:

```text
index.html
.nojekyll
assets/
README.md
SECURITY.md
LICENSE
LICENSE.md
APP_REGISTRATION_AND_TENANT_SETUP.md
TROUBLESHOOTING.md
CHANGELOG.md
VALIDATION.md
ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md
developer-source/
```

La carpeta `developer-source/` contiene el proyecto Vite, tests, scripts y workflow. GitHub Pages no la ejecuta cuando el sitio está configurado para publicar desde `main` y `/(root)`.

## 1. Descargar y descomprimir

Descarga el paquete completo y descomprímelo. No subas el ZIP directamente.

## 2. Abrir el repositorio

1. Inicia sesión en GitHub.
2. Abre el repositorio donde está publicada la aplicación.
3. En **Code**, selecciona **Add file > Upload files**.

## 3. Subir todo el contenido

Arrastra todos los archivos y carpetas que están dentro del ZIP descomprimido. `index.html` debe quedar directamente en la raíz.

La estructura correcta es:

```text
repository/
├── index.html
├── .nojekyll
├── assets/
├── README.md
├── SECURITY.md
├── LICENSE
├── LICENSE.md
├── APP_REGISTRATION_AND_TENANT_SETUP.md
├── TROUBLESHOOTING.md
├── CHANGELOG.md
├── VALIDATION.md
├── ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md
└── developer-source/
```

## 4. Confirmar los cambios

Utiliza este mensaje:

```text
Fix Power Platform API HTTP 400 compatibility and diagnostics
```

Selecciona **Commit directly to the main branch** y pulsa **Commit changes**.

## 5. Mantener la configuración de Pages

Conserva:

```text
Settings > Pages > Deploy from a branch > main > /(root)
```

No cambies a GitHub Actions para este paquete manual.

## 6. Esperar la publicación

Revisa **Actions** o **Settings > Pages** hasta que `pages build and deployment` aparezca en verde.

## 7. Forzar la actualización

- Windows: `Ctrl + F5`
- macOS: `Cmd + Shift + R`

También puedes abrir una ventana privada.

## 8. Validar la corrección

1. Confirma que la interfaz muestra **v1.0**.
2. Conecta el tenant.
3. Comprueba que el resumen por tipo y región carga.
4. Si aparece HTTP 400, abre **Detalles** y revisa el nombre de la consulta y el mensaje del servicio.
5. Verifica que un fallo en `overview-summary-by-environment` no bloquee los KPIs principales.
6. Carga manualmente un tipo de recurso.
7. Exporta CSV, JSON y PDF.
8. Comprueba las portadas de los libros en el PDF.

## Microsoft Entra

No necesitas modificar la URL de redirección si mantienes el mismo repositorio.

Permisos delegados:

```text
ResourceQuery.Resources.Read
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

No crees un Client Secret.

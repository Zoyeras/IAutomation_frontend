# TomarDatos (Frontend)

[English README](./README.en.md)

Frontend en **React + TypeScript + Vite + TailwindCSS** para capturar datos (por voz y/o manual) y enviarlos a un backend.

## Requisitos

- Node.js (recomendado **18+**)
- npm (o pnpm/yarn)

## Instalación

1. Clona este repositorio.
2. Entra a la carpeta del proyecto.
3. Instala dependencias:

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Vite mostrará la URL local (normalmente `http://localhost:5173`).

## Build / producción (opcional)

```bash
npm run build
npm run preview
```

## Qué hace esta app

- Pantalla inicial con:
  - Botón **Sincronizar** (pide permisos de micrófono y prepara voces del navegador).
  - Botón **Iniciar** para comenzar la captura.
- Captura de formulario con:
  - Indicador de estado del micrófono (**ESCUCHANDO** / **LISTO**).
  - Campos principales: NIT, empresa, ciudad, contacto, celular, correo, tipo de cliente y concepto.
  - Campos “destino”/CRM:
    - **Medio de contacto** (WhatsApp o Correo) *(no obligatorio)*.
    - **Asignado a** (lista fija).
    - **Línea de venta** (se autocompleta desde “concepto”, pero se puede ajustar manualmente).
- Sanitización básica:
  - **NIT** y **Celular** aceptan solo números (se eliminan letras/símbolos).
  - **Correo**: normaliza frases dictadas:
    - `arroba` → `@`
    - `punto` → `.`
    - `guion bajo` / `underscore` → `_`
    - `guion` / `guion medio` → `-`
    - Se **eliminan automáticamente los acentos** (é, á, í, ó, ú, ñ, etc.) para validez en dominios.
- Campos con opción "nulo":
  - Puedes decir/escribir **"nulo"**, **"null"**, **"ninguno"**, **"n/a"** en: NIT, Nombre de Empresa, Nombre del Cliente, Celular, Correo.
  - Esto dejará el campo vacío (permitido si no es obligatorio).

## Reglas del formulario (validación)

- Obligatorias:
  - **NIT**
  - **Ciudad**
  - **Tipo de cliente**
  - **Concepto**
  - **Asignado a**
  - **Línea de venta**
- **Medio de contacto**: *no obligatorio*.
  - Si eliges **Correo**, se valida formato de email.
  - Si eliges **WhatsApp**, se exige celular.

## Mapeo de “Línea de venta”

La app detecta la línea según palabras en **Concepto**:

- Si contiene `montacarg...` → `Servicio montacargas` o `Alquiler montacargas`
- Si contiene `mantenimiento` → `Mantenimiento`
- Si contiene `venta` → `Venta`

Luego el selector lo envía al backend como una etiqueta; normalmente el backend lo mapea a:

- Venta → `SOLU`
- Mantenimiento → `SERV`
- Servicio/Alquiler montacargas → `MONT`

## Configuración importante (URL del backend)

Actualmente el frontend envía el POST a:

- `http://localhost:5016/api/Registros`

Si tu backend corre en otra URL/puerto, cambia la URL en `src/App.tsx` (función `guardarEnBackend`).

> Sugerencia: si quieres hacerlo configurable por ambiente, se puede mover a `VITE_API_BASE_URL` en un `.env`.

## Logo / activos de marca (para subir a GitHub)

El logo se usa desde `public/logo_hidraulicos.webp`.

- Si el logo es **propietario** y no quieres publicarlo, este repo lo ignora por defecto en `.gitignore`.
- Para ejecutar localmente con logo real: coloca el archivo en `public/logo_hidraulicos.webp`.

## Estructura del proyecto

- `src/App.tsx`: lógica principal del formulario y captura por voz.
- `src/main.tsx`: bootstrap de React.
- `index.html`: entrada de Vite.
- `public/`: assets estáticos servidos tal cual.

## Troubleshooting

- **No aparece “ESCUCHANDO”**: revisa permisos del navegador para micrófono.
- **El reconocimiento de voz no funciona**: depende del navegador (Chrome suele funcionar mejor con Web Speech API).
- **CORS / error guardando**: el backend debe permitir solicitudes desde el origen del frontend.

## Licencia

Define la licencia del proyecto si lo vas a publicar (MIT, privada, etc.).

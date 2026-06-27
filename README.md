# CRM Neurotraumas

CRM web privado para administrar leads, conversaciones, pagos, follow-ups, configuracion visible del bot y vinculacion de WhatsApp por QR. Es un solo panel y un solo enlace; despues del login permite elegir la operacion interna `Neurotraumas` o `Holograficas`.

El CRM usa React + Vite + TailwindCSS en frontend y Express + PostgreSQL en backend. Express sirve el `dist` generado por Vite en produccion.

## Variables de entorno

Copia `.env.example` a `.env` solo en tu entorno local o configura estas variables directamente en Seenode:

```env
DATABASE_URL=
PORT=80
NODE_ENV=production
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_EXTRA_USERS=NEUROTRAUMA:$2a$12$Xf0bmTtShpeWr9itmzsebe.6ElpVcNIHgSW6RUdHlTGDqLeodXLb.
CHATBOT_API_URL=
ADMIN_API_KEY=
PRODUCT_NAME=Neurotraumas(TM)
HOTMART_LINK=https://pay.hotmart.com/T103515864E
TIMEZONE=America/La_Paz
```

No subas `.env` a GitHub. El archivo ya esta ignorado por `.gitignore`.

`DATABASE_URL` es la unica fuente de conexion a PostgreSQL. El frontend no recibe esa URL.

`CHATBOT_API_URL` y `ADMIN_API_KEY` se usan solo en el backend del CRM para llamar al chatbot con el header:

```http
x-admin-api-key: ADMIN_API_KEY
```

Cuando se elige un CRM, el frontend envia `x-crm-key` al backend y el backend lo reenvia al chatbot. Valores actuales:

- `neurotraumas`
- `holograficas`

El chatbot tambien puede consultar el CRM activo para WhatsApp con:

```http
GET /api/internal/active-crm
x-admin-api-key: ADMIN_API_KEY
```

Respuesta esperada:

```json
{ "crm_key": "holograficas", "crmKey": "holograficas", "active_crm_key": "holograficas", "whatsapp_active_crm_key": "holograficas" }
```

Cuando se elige una operacion en `/select-crm`, el CRM guarda `bot_settings.whatsapp_active_crm_key` en PostgreSQL. Ese valor queda activo aunque cierres la pagina o nadie tenga el panel abierto. Generar o reiniciar el QR desde una operacion tambien actualiza ese valor. El chatbot debe usar ese valor al insertar `leads`, `messages`, `conversations`, `conversation_memory`, `followups` y `payments`.

Como proteccion adicional, si WhatsApp esta activo en Holograficas y el chatbot aun inserta por error en `neurotraumas`, el CRM solo mueve hacia Holograficas leads creados desde la activacion de Holograficas. No arrastra historicos de Neurotraumas.

Para guardar datos estructurados desde el chatbot, usa:

```http
POST /api/internal/leads/upsert
x-admin-api-key: ADMIN_API_KEY
content-type: application/json
```

Ejemplo:

```json
{
  "name": "Maria",
  "phone": "+59170000000",
  "email": "maria@example.com",
  "country": "Bolivia",
  "city": "La Paz",
  "whatsapp_id": "59170000000@s.whatsapp.net"
}
```

Si no se manda `crm_key`, el endpoint usa el `whatsapp_active_crm_key` vigente.

La API key de Gemini no se muestra, no se guarda y no se edita desde este CRM.

El enlace principal de pago es Hotmart:

```txt
https://pay.hotmart.com/T103515864E
```

## Admin inicial

Configura:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

`ADMIN_PASSWORD` puede ser una clave normal configurada como variable de entorno o un hash bcrypt. Para mayor seguridad en produccion, usa un hash bcrypt como valor de `ADMIN_PASSWORD`.

Para usuarios adicionales usa `ADMIN_EXTRA_USERS` con formato `usuario:hashBcrypt`, separado por comas si hay mas de uno. El usuario `NEUROTRAUMA` queda configurado con hash bcrypt en `.env.example`; en Seenode debes crear esa misma variable de entorno para habilitarlo.

## Operaciones internas

- Neurotraumas: operacion actual con el logo NTR y datos existentes.
- Holograficas: operacion dentro del mismo panel, con leads, conversaciones, pagos y follow-ups filtrados por `crm_key`.

WhatsApp funciona como una sesion compartida hacia el mismo chatbot y el mismo numero. Si se desvincula o se vincula desde un CRM, el estado de WhatsApp queda reflejado en el panel, y el backend informa al chatbot cual CRM esta activo mediante `x-crm-key`.
Para mensajes entrantes, el chatbot debe guardar usando el `whatsapp_active_crm_key` vigente. Si este valor es `holograficas`, los nuevos leads y mensajes entrantes deben escribirse con `crm_key='holograficas'`.

## Base de datos compartida

El CRM lee y edita las tablas compartidas con `CHATBOT-NEURO`:

- `leads`
- `conversations`
- `messages`
- `conversation_memory`
- `bot_settings`
- `whatsapp_sessions`
- `payments`
- `followups`
- `admin_actions`

`server/database/schema.sql` contiene migraciones idempotentes con `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS`. No crea credenciales ni secretos.

Las tablas operativas incluyen `crm_key` con valor por defecto `holograficas`. Si el chatbot inserta directo sin `crm_key`, PostgreSQL lo guardara en Holograficas.

Los registros antiguos sin `crm_key` se tratan como `neurotraumas` para no mezclar historicos con Holograficas.

## Desarrollo local

```bash
npm install
npm run dev
```

Vite corre en `http://localhost:5173` y proxya `/api` hacia Express en `http://localhost:3001`.

## Produccion

```bash
npm install
npm run build
npm run start
```

El servidor escucha en:

```js
process.env.PORT || 3001
```

## Deploy en Seenode

Runtime: Node.js 20.

1. Sube el repositorio a GitHub.
2. Crea un servicio en Seenode.
3. Configura las variables `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_EXTRA_USERS`, `CHATBOT_API_URL`, `ADMIN_API_KEY`, `PRODUCT_NAME` y `TIMEZONE`.
4. Build command: `npm install && npm run build`.
5. Start command: `npm start`.
6. Port: `80`.
7. Verifica login con el admin.
8. Verifica conexion con PostgreSQL.
9. Verifica conexion con el backend del chatbot.
10. Entra a `WhatsApp QR` y prueba `Generar QR`.

## Modulos

- Dashboard: metricas de leads, pagos, conversaciones, objeciones, dolor principal, links Hotmart, estado de WhatsApp y estado global del bot.
- Leads: filtros, busqueda, acciones rapidas, detalle y exportacion CSV con telefono real, WhatsApp ID, WhatsApp LID y display phone.
- Detalle de lead: diagnostico, embudo, control de bot, conversacion, envio manual y notas.
- Conversaciones: historial por lead, filtros operativos y envio manual.
- WhatsApp QR: proxy hacia el chatbot para status, QR, generar QR, reiniciar sesion y logout.
- Pagos: confirmacion manual, retorno a pendiente, Hotmart y acceso a lead/conversacion.
- Follow-ups: pendientes, enviados, fallidos, edicion de mensaje, cancelacion, reprogramacion y envio inmediato.
- Configuracion: edicion de `bot_settings` visibles como Hotmart, modelo Gemini, temperatura, tokens, memoria, follow-ups y textos comerciales.

## Endpoints principales del CRM

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/dashboard/metrics`
- `GET /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`
- `POST /api/leads/:id/pause-bot`
- `POST /api/leads/:id/resume-bot`
- `POST /api/leads/:id/takeover`
- `POST /api/leads/:id/release-takeover`
- `POST /api/leads/:id/delete-memory`
- `POST /api/leads/:id/delete-conversation`
- `POST /api/leads/:id/mark-paid`
- `POST /api/leads/:id/send-hotmart-link`
- `POST /api/leads/:id/send-message`
- `GET /api/conversations`
- `GET /api/conversations/:leadId`
- `POST /api/conversations/:leadId/send-message`
- `GET /api/whatsapp/status`
- `GET /api/whatsapp/active-crm`
- `GET /api/whatsapp/qr`
- `POST /api/whatsapp/generate-qr`
- `POST /api/whatsapp/restart`
- `POST /api/whatsapp/logout`
- `GET /api/payments`
- `PATCH /api/payments/:id`
- `GET /api/followups`
- `PATCH /api/followups/:id`
- `POST /api/followups/:id/send-now`
- `GET /api/settings`
- `PATCH /api/settings`

## QR de WhatsApp

La pagina `WhatsApp QR` no genera el QR por si misma. Llama al backend del chatbot:

- `GET /api/whatsapp/status`
- `GET /api/whatsapp/qr`
- `POST /api/whatsapp/generate-qr`
- `POST /api/whatsapp/restart`
- `POST /api/whatsapp/logout`

Todas las llamadas se hacen desde el backend del CRM con `x-admin-api-key`. El frontend solo consume `/api/whatsapp/*` del CRM.

## Seguridad

- No hay credenciales hardcodeadas.
- `DATABASE_URL` no aparece en frontend.
- `ADMIN_API_KEY` no aparece en frontend.
- `.env` esta ignorado.
- Todas las rutas internas requieren JWT.
- No se expone ni edita la API key de Gemini.
- Las acciones sensibles crean registros en `admin_actions`.

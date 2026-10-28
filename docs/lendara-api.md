# API del anchor de Lendara (sandbox)

Resultado de probar `https://lendara-monorepo-fixh.vercel.app` con
`npm run probe` (cuenta desechable de testnet). Todo en Stellar **testnet**.

## Descubrimiento (SEP-1)

`GET /.well-known/stellar.toml` → `WEB_AUTH_ENDPOINT`, `TRANSFER_SERVER_SEP0024`,
`SIGNING_KEY`, `NETWORK_PASSPHRASE` y, en `[[CURRENCIES]]`, el `issuer` del USDC.
La app los lee en tiempo de ejecución; no se copian a mano.

- Auth: `https://lendaraweb-production.up.railway.app/auth` (otro host que el dominio de Lendara).
- SEP-24: `https://lendaraweb-production.up.railway.app/sep24`.
- CORS abierto (`access-control-allow-origin: *`): el navegador habla directo, sin backend.

## Autenticación (SEP-10)

1. `GET /auth?account=G…` → `{ transaction, network_passphrase }`.
2. Validar con `WebAuth.readChallengeTx(tx, SIGNING_KEY, passphrase, home_domain, web_auth_domain)`;
   el `home_domain` es el de Lendara en Vercel y el `web_auth_domain` el de Railway.
3. Firmar con la wallet (Freighter) y `POST /auth` con `{ transaction }` → `{ token }` (JWT, ~24 h).

## Depósito (SEP-24)

- `GET /sep24/info` → USDC habilitado, `min_amount: 1`, `max_amount: 10000`, `fee.enabled: false`
  (la comisión fija de 0,50 USDC se aplica dentro del widget, no aparece aquí).
- `POST /sep24/transactions/deposit/interactive` con `Authorization: Bearer <jwt>` y cuerpo
  `{ asset_code: "USDC", account, amount, lang: "es" }` → `{ id, type, url }`.
  `url` apunta a `https://lendara-monorepo-fixh.vercel.app/widget/<id>?…` (sin `X-Frame-Options` ni CSP).
- `GET /sep24/transaction?id=<id>` y `GET /sep24/transactions?asset_code=USDC` → `{ transaction(s) }`
  con `id, kind, status, to, amount_out_asset, more_info_url, started_at, updated_at`;
  al avanzar aparecen `amount_in`, `amount_out`, `stellar_transaction_id` y `message`.

## Estados

`incomplete` → `pending_user_transfer_start` → `pending_anchor` → `pending_stellar` → `completed`.
Ramas: `pending_trust` (sin trustline; reintenta 1 h), `expired`, `error`.

## Tarjetas de prueba

| Tarjeta               | Resultado                                              |
| --------------------- | ------------------------------------------------------ |
| `4242 4242 4242 4242` | aprobada → `completed`                                 |
| `4000 0000 0000 0002` | KYC rechazado → `error`                                |
| `4000 0000 0000 9995` | pago no recibido → `expired`                           |
| `4000 0000 0000 0077` | retrasada: 30 s en `pending_anchor`, luego `completed` |

## Widget → página

El widget hace `postMessage({ transaction }, "*")` en cada cambio de estado y
`postMessage({ type: "lendara:close" }, "*")` al cerrarse. La app solo acepta mensajes
cuyo `origin` sea el de Lendara y usa el sondeo de `/transaction` como fuente de verdad.

## Pendiente de verificar a mano

El pago con tarjeta dentro del widget (Freighter + `4242…`) no se automatiza: lo
prueba una persona en su navegador. El detalle de `amount_in`/`amount_fee` al completar
se confirma en esa prueba.

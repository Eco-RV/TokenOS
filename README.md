# Token OS

Laboratorio visual de Stellar: elige una cantidad de dinero ficticio, mira cómo se
transforma en USDC y, si quieres, **recíbelo de verdad en tu wallet Freighter de
testnet** usando el anchor de [Lendara](https://lendara-monorepo-fixh.vercel.app/docs/es)
y sus tarjetas de prueba. Todo es testnet: no se mueve dinero real.

## Qué incluye

- **Laboratorio**: calculadora con la tasa y comisión del sandbox, desglose de cargos y el
  viaje del dinero animado (usuario → proveedor de pago → anchor → cuenta Stellar).
- **Depósito real**: Freighter, trustline a USDC, SEP-10 + SEP-24 con Lendara y estado en vivo.
- **Recorrido**: línea temporal con escenarios (aprobada, KYC rechazado, expirada, retrasada).
- **Blockchain en vivo**: ledgers y pagos de Stellar testnet.
- **Convertidor**: XLM / USDC / USD / CRC / ARS / CLP / EUR con tasas de mercado reales.

## Correrlo

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + formato
npm run build
npm run probe      # prueba el anchor de Lendara con una cuenta desechable
```

Para el depósito real necesitas [Freighter](https://freighter.app) en **Testnet**. La app te guía:
conectar → fondear con Friendbot → crear la trustline a USDC → depositar con una tarjeta de prueba
(`4242 4242 4242 4242`, cualquier fecha futura y CVC).

## Cómo está hecho

React + Vite + TypeScript, sin backend ni base de datos (Lendara tiene CORS abierto). Ver
[docs/lendara-api.md](docs/lendara-api.md) para la API probada del anchor,
[docs/FLUJO.md](docs/FLUJO.md) para ramas y releases, y [CHANGELOG.md](CHANGELOG.md).
`docs/prototype.html` es el prototipo original de un solo archivo.

Estilo visual: sistema de las apps de Oswald (paleta «Nebula» de AstrOS).

## Licencia

MIT

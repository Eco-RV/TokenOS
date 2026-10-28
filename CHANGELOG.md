# Changelog

Formato: una sección por versión (`## x.y.z — AAAA-MM-DD`, o `— sin publicar`
mientras se desarrolla). Flujo completo en [docs/FLUJO.md](docs/FLUJO.md).

## 1.0.0 — 2026-10-27

Primera versión: laboratorio visual de Stellar con depósito real en testnet.

### Laboratorio y recorrido (simulación)

- Calculadora con la tasa y la comisión fija del sandbox de Lendara, más
  comisiones de producción ilustrativas opcionales y comparación con la tasa de
  mercado real.
- El viaje del dinero animado (usuario → proveedor de pago → anchor → cuenta
  Stellar), el botón «¿Qué acaba de pasar?» y una línea temporal con los
  escenarios de las tarjetas de prueba.

### Depósito real

- Conexión con **Freighter** (solo Testnet) y saldos de XLM y USDC desde Horizon.
- Fondeo con Friendbot y creación de la trustline a USDC, firmada en Freighter.
- Depósito SEP-10 + SEP-24 con el anchor de Lendara: se firma el desafío, se abre
  el widget en una ventana emergente y se sigue el estado hasta `completed`, con el
  resultado y el hash en Stellar Expert.
- `npm run probe`: prueba el anchor de punta a punta con una cuenta desechable.

### Blockchain y utilidad

- Ledgers y pagos de Stellar testnet en vivo (Horizon) y consulta de cuenta.
- Convertidor XLM / USDC / USD / CRC / ARS / CLP / EUR con tasas de mercado reales.
- Cadena de bloques ilustrativa en el hero (cada bloque guarda el hash del anterior).

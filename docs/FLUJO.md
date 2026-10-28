# Flujo de trabajo

Igual que AstrOS y LibrOS, sin contratos ni base de datos: todo vive en el navegador y en Stellar testnet.

## Ramas

- `main`: producción (Vercel Production). Solo recibe PRs desde `dev_main`. Nunca se commitea directo.
- `dev_main`: integración (Vercel Previews).
- `feature/x.y.z`: se crea desde `dev_main` y vuelve con PR (merge commit).
- Docs y arreglos pequeños pueden ir directo a `dev_main`.

## Cada versión

1. `feature/x.y.z` desde `dev_main`; subir `version` en `package.json`.
2. Agregar la sección `## x.y.z — sin publicar` en `CHANGELOG.md`.
3. `npm run check` (typecheck, lint, formato) y `npm run build` en verde; CI corre lo mismo.
4. PR a `dev_main`; la persona dueña del repo hace el merge.
5. Probar el Preview de Vercel (Freighter + tarjeta de prueba).
6. PR `dev_main` → `main`; fechar la sección del CHANGELOG.
7. Después del merge: `git tag -a vX.Y.Z origin/main` y un GitHub Release con esa sección del CHANGELOG.

## Entornos

| Entorno    | Rama                  | Notas                             |
| ---------- | --------------------- | --------------------------------- |
| local      | cualquiera            | `npm run dev` en `localhost:5173` |
| staging    | `dev_main` y Previews | testnet                           |
| production | `main`                | testnet (el anchor es un sandbox) |

El anchor, las tasas y las tarjetas son del sandbox de Lendara; no hay variables de entorno ni secretos.

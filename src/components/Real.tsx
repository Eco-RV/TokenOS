import { useCallback, useEffect, useRef, useState } from "react"
import { connectFreighter, assertTestnet } from "../lib/freighter"
import { fmt, short } from "../lib/format"
import { HOME, authenticate, getTransaction, startDeposit, type LendaraTx, type Toml } from "../lib/lendara"
import type { Step } from "../lib/sim"
import {
	addUsdcTrustline,
	explorerAccount,
	explorerTx,
	fundWithFriendbot,
	loadBalances,
	type Balances,
} from "../lib/stellar"
import { Timeline } from "./Timeline"
import { Track } from "./Track"

const ORDER = ["incomplete", "pending_user_transfer_start", "pending_anchor", "pending_stellar", "completed"]
const FINAL = ["completed", "expired", "error", "no_market", "too_small", "too_large"]

function realSteps(tx: LendaraTx | null): { steps: Step[]; cur: number } {
	const out = tx?.amount_out ? `${fmt(Number(tx.amount_out))} USDC` : "USDC"
	const mk = (node: number, state: string, off: boolean, t: string, d: string, proc: string, usdc = false): Step => ({
		node,
		state,
		off,
		usdc,
		coin: usdc ? out : "Fiat",
		t,
		d,
		proc,
	})
	const steps = [
		mk(
			0,
			"incomplete",
			true,
			"Sesión SEP-24 creada",
			"Firmaste el desafío SEP-10 con Freighter y Lendara abrió el depósito para tu cuenta.",
			"Procesa: tu clave pública y el monto sugerido.",
		),
		mk(
			1,
			"pending_user_transfer_start",
			true,
			"Confirmas el monto y pagas",
			"En el widget de Lendara eliges moneda y monto, y pagas con una tarjeta de prueba.",
			"Procesa: datos de tarjeta simulados. Nada de esto llega a la blockchain.",
		),
		mk(
			2,
			"pending_anchor",
			true,
			"Lendara recibe el pago",
			"El anchor confirma el cobro y prepara el USDC para tu cuenta.",
			"Procesa: confirmación de cobro, cotización y comisión.",
			true,
		),
		mk(
			2,
			"pending_stellar",
			false,
			"Lendara envía el pago a Stellar",
			"El anchor firma y envía una transacción de pago a la red.",
			"Procesa: transacción firmada y comisión de red.",
			true,
		),
		mk(
			3,
			"completed",
			false,
			"USDC en tu cuenta",
			"El pago quedó en un ledger de Stellar, con hash público e inmutable.",
			"Registra on-chain: origen, destino, activo, monto y hash.",
			true,
		),
	]
	const st = tx?.status ?? "incomplete"
	if (st === "pending_trust")
		return {
			steps: [
				...steps.slice(0, 3),
				{
					...steps[3],
					state: "pending_trust",
					err: true,
					t: "Falta la trustline a USDC",
					d: "Tu cuenta no tiene línea de confianza al USDC de Lendara. Créala desde el paso 3; Lendara reintenta durante una hora.",
				},
			],
			cur: 3,
		}
	if (st === "expired" || st === "error")
		return {
			steps: [
				...steps.slice(0, 2),
				{
					...steps[1],
					state: st,
					err: true,
					coin: "✖",
					t: st === "expired" ? "La operación expiró" : "La operación falló",
					d:
						tx?.message ??
						(st === "expired"
							? "Lendara no recibió el pago a tiempo; no se envió USDC."
							: "Algo falló: por ejemplo, el KYC fue rechazado. No se movió nada en Stellar."),
				},
			],
			cur: 2,
		}
	return { steps, cur: Math.max(0, ORDER.indexOf(st)) }
}

interface Props {
	toml: Toml | null
	onIssuer: (i: string) => void
}

export function Real({ toml, onIssuer }: Props) {
	const [addr, setAddr] = useState<string | null>(null)
	const [bal, setBal] = useState<Balances | null>(null)
	const [amt, setAmt] = useState("25000")
	const [tx, setTx] = useState<LendaraTx | null>(null)
	const [err, setErr] = useState("")
	const [busy, setBusy] = useState("")
	const [trustHash, setTrustHash] = useState("")
	const jwt = useRef("")

	useEffect(() => {
		if (toml) onIssuer(toml.issuer)
	}, [toml, onIssuer])

	const refresh = useCallback(
		async (a = addr) => {
			if (!a || !toml) return
			try {
				setBal(await loadBalances(a, toml.issuer))
			} catch (e) {
				setErr((e as Error).message)
			}
		},
		[addr, toml],
	)

	async function run<T>(label: string, f: () => Promise<T>): Promise<T | undefined> {
		setErr("")
		setBusy(label)
		try {
			return await f()
		} catch (e) {
			setErr((e as Error).message)
		} finally {
			setBusy("")
		}
	}

	const connect = () =>
		run("connect", async () => {
			const w = await connectFreighter()
			setAddr(w.address)
			if (toml) setBal(await loadBalances(w.address, toml.issuer))
		})
	const fund = () =>
		run("fund", async () => {
			await fundWithFriendbot(addr!)
			await refresh()
		})
	const trust = () =>
		run("trust", async () => {
			await assertTestnet()
			setTrustHash(await addUsdcTrustline(addr!, toml!.issuer))
			await refresh()
		})

	// Truco anti-bloqueo de ventanas: se abre en el clic, antes de cualquier await.
	function deposit() {
		if (!addr || !toml) return
		const popup = window.open("", "lendara-widget", "width=480,height=780")
		if (!popup) {
			setErr("El navegador bloqueó la ventana emergente. Permítela para este sitio e inténtalo de nuevo.")
			return
		}
		popup.document.write('<p style="font:16px monospace;padding:24px">Conectando con Lendara…</p>')
		setTx(null)
		void run("deposit", async () => {
			try {
				await assertTestnet()
				jwt.current = await authenticate(toml, addr)
				const { id, url } = await startDeposit(toml, jwt.current, addr, Number(amt))
				popup.location.href = url
				setTx({ id, kind: "deposit", status: "incomplete" })
			} catch (e) {
				popup.close()
				throw e
			}
		})
	}

	// El widget avisa con postMessage; solo se acepta del origen de Lendara. El sondeo es la fuente de verdad.
	useEffect(() => {
		const on = (e: MessageEvent) => {
			if (e.origin !== new URL(HOME).origin) return
			const t = (e.data as { transaction?: LendaraTx } | null)?.transaction
			if (t?.id) setTx((o) => (o && o.id === t.id ? { ...o, ...t } : o))
		}
		addEventListener("message", on)
		return () => removeEventListener("message", on)
	}, [])

	const id = tx?.id
	const done = tx ? FINAL.includes(tx.status) : true
	useEffect(() => {
		if (!id || done || !toml) return
		const t = window.setInterval(async () => {
			try {
				const n = await getTransaction(toml, jwt.current, id)
				setTx(n)
				if (FINAL.includes(n.status)) void refresh()
			} catch {
				/* reintenta en el próximo ciclo */
			}
		}, 3000)
		return () => window.clearInterval(t)
	}, [id, done, toml, refresh])

	const { steps, cur } = realSteps(tx)
	const s = steps[Math.min(cur, steps.length - 1)]
	const hasTrust = bal?.usdc !== null && bal?.usdc !== undefined
	const num = Number(amt)
	const step = (n: number, ok: boolean, t: string) => (
		<span className={`badge ${ok ? "on" : "off"}`}>
			{ok ? "✓" : n} {t}
		</span>
	)

	return (
		<div className="sec">
			<div className="chap">
				<div className="cell">
					<div className="num">02</div>
					<div className="kicker">Testnet · Freighter + Lendara</div>
					<h2>Depósito real</h2>
				</div>
				<div className="cell">
					Paga con una tarjeta de prueba y recibe USDC de testnet en tu propia wallet. Es dinero ficticio: no se cobra
					nada real.
				</div>
			</div>
			<div className="grid two">
				<div className="cell">
					<h3 className="k">Prepara tu cuenta</h3>
					<div className="chips" style={{ marginBottom: 12 }}>
						{step(1, !!addr, "Freighter")}
						{step(2, !!bal?.exists, "Cuenta fondeada")}
						{step(3, hasTrust, "Trustline USDC")}
					</div>
					{!addr ? (
						<button className="btn" type="button" disabled={busy === "connect" || !toml} onClick={connect}>
							{busy === "connect" ? "Conectando…" : "Conectar Freighter"}
						</button>
					) : (
						<>
							<p className="note" style={{ marginTop: 0 }}>
								Cuenta{" "}
								<a href={explorerAccount(addr)} target="_blank" rel="noopener" className="mono">
									{short(addr)}
								</a>
							</p>
							<table>
								<tbody>
									<tr>
										<td>XLM</td>
										<td>{bal?.exists ? fmt(bal.xlm) : "—"}</td>
									</tr>
									<tr>
										<td>USDC (Lendara)</td>
										<td>{bal?.exists ? (bal.usdc === null ? "sin trustline" : fmt(bal.usdc)) : "—"}</td>
									</tr>
								</tbody>
							</table>
							<div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
								{bal && !bal.exists && (
									<button className="btn" type="button" disabled={!!busy} onClick={fund}>
										{busy === "fund" ? "Fondeando…" : "Fondear con Friendbot"}
									</button>
								)}
								{bal?.exists && bal.usdc === null && (
									<button className="btn" type="button" disabled={!!busy} onClick={trust}>
										{busy === "trust" ? "Firma en Freighter…" : "Crear trustline USDC"}
									</button>
								)}
								<button className="btn line" type="button" disabled={!!busy} onClick={() => refresh()}>
									↺ Actualizar
								</button>
							</div>
							{trustHash && (
								<p className="note">
									Trustline creada:{" "}
									<a href={explorerTx(trustHash)} target="_blank" rel="noopener">
										ver transacción
									</a>
								</p>
							)}
						</>
					)}
					<h3 className="k" style={{ marginTop: 28 }}>
						Depósito con Lendara
					</h3>
					<label htmlFor="ramt">Monto sugerido (lo confirmas en el widget)</label>
					<input id="ramt" type="number" min="1" step="1" value={amt} onChange={(e) => setAmt(e.target.value)} />
					<p className="note">
						Tarjetas de prueba: <b>4242 4242 4242 4242</b> aprobada · <b>4000 0000 0000 0002</b> KYC rechazado ·{" "}
						<b>4000 0000 0000 9995</b> expira · <b>4000 0000 0000 0077</b> retrasada. Cualquier fecha futura y CVC.
					</p>
					<button
						className="btn"
						type="button"
						style={{ marginTop: 10 }}
						disabled={!addr || !hasTrust || !(num > 0) || !!busy || (!!tx && !done)}
						onClick={deposit}
					>
						{busy === "deposit" ? "Firma el desafío en Freighter…" : "Depositar con Lendara"}
					</button>
					{addr && bal?.exists && !hasTrust && (
						<p className="note">Primero crea la trustline: sin ella Lendara no puede enviarte USDC.</p>
					)}
					{err && (
						<p className="note" role="alert" style={{ color: "var(--alert)" }}>
							{err}
						</p>
					)}
				</div>
				<div className="cell">
					<h3 className="k">El viaje, en vivo</h3>
					<Track step={s} />
					<div className="stat">
						<span className="state">{tx?.status ?? "sin operación"}</span>
						<span className="mut">
							paso {Math.min(cur, steps.length - 1) + 1} de {steps.length}
						</span>
					</div>
					<div className="stepmsg">
						<b>{s.t}</b>
						{s.d}
					</div>
					<Timeline steps={steps} cur={cur} onPick={() => undefined} />
					{tx?.status === "completed" && (
						<div className="stepmsg">
							<b>Resultado</b>
							<table>
								<tbody>
									{tx.amount_in && (
										<tr>
											<td>Pagaste</td>
											<td>
												{tx.amount_in} {tx.amount_in_asset?.split(":").pop()}
											</td>
										</tr>
									)}
									{tx.amount_fee && (
										<tr>
											<td>Comisión</td>
											<td>{tx.amount_fee}</td>
										</tr>
									)}
									{tx.amount_out && (
										<tr className="total">
											<td>Recibiste</td>
											<td>{fmt(Number(tx.amount_out))} USDC</td>
										</tr>
									)}
								</tbody>
							</table>
							{tx.stellar_transaction_id && (
								<p className="note">
									<a href={explorerTx(tx.stellar_transaction_id)} target="_blank" rel="noopener">
										Ver el pago en Stellar Expert
									</a>{" "}
									· hash <span className="mono">{short(tx.stellar_transaction_id)}</span>
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

import { fmt, sym } from "./format"
import { FEE, SANDBOX, type Rates } from "./rates"

export interface Calc {
	cur: string
	fiat: number
	prod: boolean
	rate: number
	real: number
	gross: number
	proc: number
	spread: number
	net: number
	marketUsd: number
	lossPct: number
	xlm: number
}

export function calc(cur: string, fiat: number, prod: boolean, r: Rates): Calc {
	const rate = SANDBOX[cur]
	const real = r.usd[cur]
	const gross = fiat / rate
	const proc = prod ? fiat * 0.029 : 0
	const spread = prod ? gross * 0.01 : 0
	const net = Math.max(0, gross - proc / rate - spread - FEE)
	const marketUsd = fiat / real
	const lossPct = marketUsd > 0 ? ((marketUsd - net) / marketUsd) * 100 : 0
	return { cur, fiat, prod, rate, real, gross, proc, spread, net, marketUsd, lossPct, xlm: net / r.xlm }
}

export interface Step {
	node: number
	state: string
	off: boolean
	err?: boolean
	usdc?: boolean
	coin: string
	t: string
	d: string
	proc: string
}

export const SCN: Record<string, { n: string; fail: "kyc" | "exp" | "trust" | null; delay?: boolean }> = {
	approved: { n: "4242 4242 4242 4242 · aprobada", fail: null },
	delayed: { n: "4000 0000 0000 0077 · retrasada (30 s en pending_anchor)", fail: null, delay: true },
	trust: { n: "Sin trustline a USDC · pending_trust", fail: "trust" },
	kyc: { n: "4000 0000 0000 0002 · KYC rechazado", fail: "kyc" },
	noPay: { n: "4000 0000 0000 9995 · pago no recibido", fail: "exp" },
}

export const NODES = [
	{ n: "Usuario", w: "Quien quiere convertir su dinero.", p: "Sabe: monto, moneda local, su clave Stellar." },
	{
		n: "Proveedor de pago",
		w: "Cobra la tarjeta o transferencia.",
		p: "Ve: datos de pago, autorización. Cobra su propia comisión.",
	},
	{
		n: "Anchor (Lendara)",
		w: "Puente entre moneda local y la red Stellar.",
		p: "Ve: KYC, cotización, pagos. Tiene el USDC y lo emite a tu cuenta.",
	},
	{
		n: "Cuenta Stellar",
		w: "Tu dirección en la blockchain.",
		p: "Registra públicamente: saldos y pagos de USDC. Nada de identidad.",
	},
]

export function buildSteps(scn: string, c: Calc): Step[] {
	const s = SCN[scn] ?? SCN.approved
	const fiatCoin = `${sym[c.cur]}${fmt(c.fiat, 0)}`
	const usdcCoin = `${fmt(c.net, 2)} USDC`
	const base: Step[] = [
		{
			node: 0,
			state: "incomplete",
			off: true,
			coin: fiatCoin,
			t: "Decides cuánto convertir",
			d: `Abres el widget de Lendara y eliges ${fmt(c.fiat)} ${c.cur}. El anchor crea una sesión SEP-24 para tu cuenta Stellar.`,
			proc: "Procesa: monto elegido, moneda, tu clave pública (G…). Todavía no hay dinero movido.",
		},
		{
			node: 1,
			state: "pending_user_transfer_start",
			off: true,
			coin: fiatCoin,
			t: "Pagas con tarjeta",
			d: `Confirmas la cotización (1 USDC = ${fmt(c.rate, 0)} ${c.cur}) y pagas. En la vida real, el proveedor de pago autoriza el cargo; aquí es simulado.`,
			proc: "Procesa: datos de tarjeta, autorización, antifraude. Estos datos NUNCA llegan a la blockchain.",
		},
		{
			node: 2,
			state: "pending_anchor",
			off: true,
			usdc: true,
			coin: usdcCoin,
			t: "El anchor recibe el pago y convierte",
			d: `Lendara recibe la confirmación del pago, aplica su comisión fija de ${fmt(FEE)} USDC y prepara ${fmt(c.net)} USDC para ti.`,
			proc: "Procesa: confirmación de cobro, cotización, KYC, inventario de USDC y su cuenta emisora/distribuidora.",
		},
		{
			node: 2,
			state: "pending_stellar",
			off: false,
			usdc: true,
			coin: usdcCoin,
			t: "Se envía el pago a Stellar",
			d: "El anchor firma una transacción de pago con su clave y la envía a la red. Los validadores la incluyen en un ledger (~5 s).",
			proc: "Procesa: transacción firmada, comisión de red (0,00001 XLM), número de secuencia.",
		},
		{
			node: 3,
			state: "completed",
			off: false,
			usdc: true,
			coin: usdcCoin,
			t: "¡Recibido en tu cuenta Stellar!",
			d: `Tu cuenta tiene ${fmt(c.net)} USDC. El hash de la transacción queda registrado públicamente y es inmutable.`,
			proc: "Registra on-chain: cuenta origen, cuenta destino, activo, monto y hash. No registra tu nombre ni tu tarjeta.",
		},
	]
	if (s.fail === "kyc")
		return [
			base[0],
			base[1],
			{
				node: 1,
				state: "error",
				off: true,
				err: true,
				coin: "✖",
				t: "KYC rechazado",
				d: "La verificación de identidad falló, así que el anchor cancela la operación. No se movió nada en Stellar.",
				proc: "Mensaje: «KYC rejected». Todo ocurrió fuera de la blockchain.",
			},
		]
	if (s.fail === "exp")
		return [
			base[0],
			base[1],
			{
				node: 1,
				state: "expired",
				off: true,
				err: true,
				coin: "⌛",
				t: "El pago nunca llegó",
				d: "El anchor no recibió confirmación del pago a tiempo. La sesión expira y no se envía USDC.",
				proc: "Estado final: expired. Sin rastro on-chain.",
			},
		]
	if (s.fail === "trust")
		return [
			base[0],
			base[1],
			base[2],
			{
				node: 2,
				state: "pending_trust",
				off: false,
				err: true,
				usdc: true,
				coin: usdcCoin,
				t: "Tu cuenta no tiene trustline a USDC",
				d: "En Stellar debes autorizar explícitamente cada activo (trustline) antes de recibirlo. Lendara reintenta durante una hora.",
				proc: "Consulta la cuenta en Horizon: no existe línea de confianza al emisor del USDC de Lendara.",
			},
		]
	if (s.delay)
		base[2] = {
			...base[2],
			t: "El anchor tarda en procesar (30 s)",
			d: "La tarjeta «retrasada» mantiene la operación en pending_anchor durante 30 s antes de continuar. Es normal que los anchors reales tarden.",
		}
	return base
}

/** Cantidad de pasos de cada escenario (debe coincidir con buildSteps). */
export const stepCount = (scn: string) => ((SCN[scn] ?? SCN.approved).fail === "trust" ? 4 : SCN[scn]?.fail ? 3 : 5)

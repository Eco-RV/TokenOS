import { useCallback, useEffect, useRef, useState } from "react"
import { stepCount } from "./lib/sim"

export interface SimState {
	amt: string
	cur: string
	prod: boolean
	scn: string
	step: number
}

export interface Sim extends SimState {
	set: (p: Partial<SimState>) => void
	play: () => void
	stop: () => void
	goto: (i: number) => void
}

/** Estado compartido del laboratorio y del recorrido. */
export function useSim(): Sim {
	const [s, setS] = useState<SimState>({ amt: "25000", cur: "CRC", prod: false, scn: "approved", step: 0 })
	const timer = useRef<number | undefined>(undefined)

	const stop = useCallback(() => window.clearInterval(timer.current), [])
	const set = useCallback(
		(p: Partial<SimState>) => {
			stop()
			setS((o) => ({ ...o, ...p, step: 0 }))
		},
		[stop],
	)
	const goto = useCallback(
		(i: number) => {
			stop()
			setS((o) => ({ ...o, step: i }))
		},
		[stop],
	)
	const play = useCallback(() => {
		stop()
		setS((o) => ({ ...o, step: 0 }))
		timer.current = window.setInterval(() => {
			setS((o) => {
				if (o.step >= stepCount(o.scn) - 1) {
					window.clearInterval(timer.current)
					return o
				}
				return { ...o, step: o.step + 1 }
			})
		}, 1700)
	}, [stop])
	useEffect(() => stop, [stop])
	return { ...s, set, play, stop, goto }
}

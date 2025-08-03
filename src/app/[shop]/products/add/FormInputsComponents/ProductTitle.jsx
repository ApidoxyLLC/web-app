"use client"
import { useState } from "react"

export default function ProductTitle() {
    const [state, setState] = useState({ disabled: false, focused: false, error: true })

    return (<div data-slot="control-group-item" className={` flex min-h-9 flex-1 items-center gap-2 bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm rounded-none focus-within:z-10 -me-px h-auto first:rounded-s-md last:-me-0 last:rounded-e-md selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-2 `}>
                <input disabled={state.disabled} data-slot="input-base-control" placeholder="ex.. Short sleeve t-shirt" className={` w-full flex-1 bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground file:text-foreground file:border-0 file:bg-transparent file:font-medium outline-none disabled:pointer-events-none disabled:opacity-50 ${state.disabled ? "cursor-not-allowed" : ""} `} />
            </div>)
}

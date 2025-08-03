import React from 'react'

export default function ProductDescription() {
  return (
    <textarea data-slot="textarea" className="h-32 border border-input rounded-md px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 dark:aria-[invalid=true]:ring-destructive/40 dark:bg-input/30 field-sizing-content" placeholder="Product description" />
  )
}

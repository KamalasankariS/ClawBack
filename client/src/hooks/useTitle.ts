import { useEffect } from 'react'

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Confido` : 'Confido — Deduction Recovery'
  }, [title])
}

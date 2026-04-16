import { useEffect, useState } from "react"

/**
 * `window.matchMedia` 기반. SSR/첫 페인트에서는 `false`로 두고 마운트 후 갱신합니다.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const m = window.matchMedia(query)
    const update = () => setMatches(m.matches)
    update()
    m.addEventListener("change", update)

    return () => m.removeEventListener("change", update)
  }, [query])

  return matches
}

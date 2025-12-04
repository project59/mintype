import { useEffect } from "react"

export function useDynamicThemeColor() {
  useEffect(() => {
    const root = document.documentElement
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')

    if (!metaThemeColor) return

    const updateColor = () => {
      const isDark = root.classList.contains("dark")
      const color = isDark ? "#10101e" : "#f1f5f9" // pick your light/dark values
      metaThemeColor.setAttribute("content", color)
    }

    // Initial run
    updateColor()

    // Watch for Tailwind dark class toggles
    const observer = new MutationObserver(updateColor)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => observer.disconnect()
  }, [])
}
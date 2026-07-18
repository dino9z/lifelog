export interface ThemeOption {
  id: string
  label: string
  preview: [string, string] // gradient stops for the swatch
  soon?: boolean
}

/**
 * Only Dark + Light are wired this pass. The remaining themes are listed as
 * "soon" to show where the palette is heading — each becomes one CSS block.
 */
export const THEMES: ThemeOption[] = [
  { id: 'dark', label: 'Dark', preview: ['#0d1017', '#818cf8'] },
  { id: 'light', label: 'Light', preview: ['#f2f4f9', '#4f46e5'] },
  { id: 'forest', label: 'Forest', preview: ['#0a120e', '#34d399'] },
  { id: 'ocean', label: 'Ocean', preview: ['#06101c', '#38bdf8'] },
  { id: 'rain', label: 'Rain', preview: ['#0e1620', '#7dd3fc'] },
  { id: 'coffee', label: 'Coffee', preview: ['#1a120b', '#d6a05a'] },
  { id: 'sakura', label: 'Sakura', preview: ['#1a0f16', '#f9a8d4'] },
  { id: 'future', label: 'Future', preview: ['#05060a', '#22d3ee'] },
]

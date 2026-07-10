/** PATH 线型：虚线预设与 OFD Cap/Join 映射 */

export type LineCap = 'butt' | 'round' | 'square'
export type LineJoin = 'miter' | 'round' | 'bevel'

export const DASH_PRESETS = [
  { id: 'solid', label: '实线', pattern: undefined as string | undefined },
  { id: 'dashed', label: '虚线', pattern: '4 2' },
  { id: 'dotted', label: '点线', pattern: '1 2' },
  { id: 'dashdot', label: '点划线', pattern: '6 2 1 2' },
] as const

export function parseDashPattern(pattern?: string | null): number[] {
  if (!pattern?.trim()) return []
  return pattern.trim().split(/\s+/).map(Number).filter((n) => !Number.isNaN(n) && n > 0)
}

export function dashPatternToKonva(pattern: string | undefined, scale: number): number[] | undefined {
  const nums = parseDashPattern(pattern)
  if (nums.length === 0) return undefined
  return nums.map((n) => n * scale)
}

export function normalizeLineCap(cap?: string | null): LineCap {
  const v = (cap ?? 'round').toLowerCase()
  if (v === 'butt' || v === 'square' || v === 'round') return v
  return 'round'
}

export function normalizeLineJoin(join?: string | null): LineJoin {
  const v = (join ?? 'round').toLowerCase()
  if (v === 'miter' || v === 'bevel' || v === 'round') return v
  return 'round'
}

export function dashPresetIdFromPattern(pattern?: string): string {
  const p = pattern?.trim() ?? ''
  for (const preset of DASH_PRESETS) {
    if ((preset.pattern ?? '') === p) return preset.id
  }
  return p ? 'custom' : 'solid'
}

export function dashPatternFromPresetId(presetId: string): string | undefined {
  const preset = DASH_PRESETS.find((p) => p.id === presetId)
  return preset?.pattern
}

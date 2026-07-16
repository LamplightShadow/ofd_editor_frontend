import type { ElementData } from '@/types'

/** 缺失 DeltaX 时的字宽估计（mm） */
function estimateAdvanceMm(ch: string, fontSizeMm: number): number {
  if (!ch) return fontSizeMm
  const code = ch.codePointAt(0) ?? 0
  // 全角标点略窄，避免尾部「：」顶进右侧数字区
  if (/[：:）)、，。；;！!？?]/.test(ch)) return fontSizeMm * 0.55
  if (code >= 0x4e00 && code <= 0x9fff) return fontSizeMm
  if (/[0-9０-９]/.test(ch)) return fontSizeMm * 0.5
  if (/[a-zA-Z]/.test(ch)) return fontSizeMm * 0.55
  return fontSizeMm * 0.6
}

/** 是否应按 OFD DeltaX 逐字绘制（单行横排） */
export function usesGlyphAdvances(el: ElementData): boolean {
  if (el.type !== 'TEXT') return false
  if (el.verticalLayout || el.passwordGrid) return false
  const content = el.content ?? ''
  if (!content || content.includes('\n')) return false
  const adv = el.glyphAdvancesMm
  if (!Array.isArray(adv) || content.length < 2) return false
  // 允许末尾少 1～2 个间距（全电发票标签常见 DeltaX 短一截）
  return adv.length >= Math.max(1, content.length - 3)
}

/** 第 i 个字符相对首字原点的 x 偏移（mm） */
export function glyphCharOffsetMm(
  advances: number[],
  index: number,
  content?: string,
  fontSizeMm = 3.175,
): number {
  let x = 0
  for (let i = 0; i < index; i++) {
    const a = i < advances.length ? advances[i] : undefined
    if (typeof a === 'number' && Number.isFinite(a) && a > 0) {
      x += a
    } else {
      x += estimateAdvanceMm(content?.[i] ?? '', fontSizeMm)
    }
  }
  return x
}

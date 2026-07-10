/** 段落级文本排版（对齐 / 字距 / 行距），与 OFD TextCode DeltaX/DeltaY 对应 */

export type TextAlign = 'left' | 'center' | 'right'

export const DEFAULT_LINE_HEIGHT_RATIO = 1.2

export function normalizeTextAlign(v?: string | null): TextAlign {
    if (v === 'center' || v === 'right') return v
    return 'left'
}

export function effectiveLineSpacingMm(fontSizeMm: number, lineSpacingMm?: number): number {
    if (typeof lineSpacingMm === 'number' && lineSpacingMm > 0) return lineSpacingMm
    return fontSizeMm * DEFAULT_LINE_HEIGHT_RATIO
}

export function lineHeightRatio(fontSizeMm: number, lineSpacingMm?: number): number {
    if (fontSizeMm <= 0) return DEFAULT_LINE_HEIGHT_RATIO
    return effectiveLineSpacingMm(fontSizeMm, lineSpacingMm) / fontSizeMm
}

/** 单行自然宽度（mm），含额外字距 */
export function measureLineWidthMm(
    line: string,
    fontSizeMm: number,
    letterSpacingMm = 0,
    bold?: boolean,
): number {
    if (!line) return 0
    let sum = 0
    for (let i = 0; i < line.length; i++) {
        sum += glyphAdvanceMm(line[i]!, fontSizeMm, bold)
        if (i < line.length - 1) sum += letterSpacingMm
    }
    return sum
}

/** 多行文本外接宽度 */
export function measureParagraphWidthMm(
    text: string,
    fontSizeMm: number,
    letterSpacingMm = 0,
    bold?: boolean,
): number {
    const lines = text.split('\n')
    let max = 0
    for (const line of lines) {
        max = Math.max(max, measureLineWidthMm(line, fontSizeMm, letterSpacingMm, bold))
    }
    return max
}

export function computeAlignOffsetMm(
    align: TextAlign,
    boxWidthMm: number,
    lineWidthMm: number,
): number {
    if (boxWidthMm <= 0) return 0
    switch (align) {
        case 'center':
            return Math.max(0, (boxWidthMm - lineWidthMm) * 0.5)
        case 'right':
            return Math.max(0, boxWidthMm - lineWidthMm)
        default:
            return 0
    }
}

function glyphAdvanceMm(ch: string, fontSizeMm: number, bold?: boolean): number {
    if (!ch || ch === '\n') return 0
    const scale = bold ? 1.06 : 1
    const code = ch.charCodeAt(0)
    if (
        (code >= 0x2e80 && code <= 0x9fff) ||
        (code >= 0xa000 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7af) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xff00 && code <= 0xffef) ||
        (code >= 0x3000 && code <= 0x303f)
    ) return fontSizeMm * scale
    if (ch === ' ') return fontSizeMm * 0.32 * scale
    if (ch === '¥' || ch === '￥') return fontSizeMm * 0.72 * scale
    if (/[il.,;:'!|`]/.test(ch)) return fontSizeMm * 0.30 * scale
    if (/[A-Z0-9#&%@$]/.test(ch)) return fontSizeMm * 0.62 * scale
    return fontSizeMm * 0.55 * scale
}

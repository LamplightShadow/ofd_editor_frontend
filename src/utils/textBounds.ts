/** 12pt → mm */
export const DEFAULT_TYPEWRITER_FONT_SIZE_MM = (12 * 25.4) / 72

function approxAdvanceEm(ch: string, bold?: boolean): number {
    if (!ch || ch === '\n') return 0
    const code = ch.charCodeAt(0)
    const boldScale = bold ? 1.06 : 1.0
    if (
        (code >= 0x2e80 && code <= 0x9fff) ||
        (code >= 0xa000 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7af) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xff00 && code <= 0xffef) ||
        (code >= 0x3000 && code <= 0x303f)
    ) return 1.0 * boldScale
    if (ch === ' ') return 0.32 * boldScale
    if (ch === '¥' || ch === '￥' || ch === '\u00a5' || ch === '\uffe5') return 0.72 * boldScale
    if (/[il.,;:'!|`]/.test(ch)) return 0.30 * boldScale
    if (/[A-Z0-9#&%@$]/.test(ch)) return 0.62 * boldScale
    return 0.55 * boldScale
}

export function estimateTextWidthMm(
    text: string,
    fontSizeMm: number,
    bold?: boolean,
    letterSpacingMm = 0,
): number {
    const lines = text.split('\n')
    let maxLineEm = 0
    for (const line of lines) {
        let sum = 0
        for (let i = 0; i < line.length; i++) {
            sum += approxAdvanceEm(line[i]!, bold)
            if (i < line.length - 1 && letterSpacingMm > 0) {
                sum += letterSpacingMm / fontSizeMm
            }
        }
        maxLineEm = Math.max(maxLineEm, sum)
    }
    return Math.max(fontSizeMm * 0.5, maxLineEm * fontSizeMm)
}

export function estimateTextHeightMm(
    text: string,
    fontSizeMm: number,
    lineSpacingMm?: number,
): number {
    const lineCount = Math.max(1, text.split('\n').length)
    const step = typeof lineSpacingMm === 'number' && lineSpacingMm > 0
        ? lineSpacingMm
        : fontSizeMm * 1.25
    return lineCount * step
}

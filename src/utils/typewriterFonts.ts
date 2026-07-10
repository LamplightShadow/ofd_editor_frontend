/** 打字机/OFD 正文字体预设（FontName → DocumentRes Font 资源） */
export interface TypewriterFontOption {
    /** OFD FontName / 前端 fontFamily */
    value: string
    /** 界面显示名 */
    label: string
    /** OFD FamilyName */
    familyName: string
}

export const TYPEWRITER_FONT_OPTIONS: TypewriterFontOption[] = [
    { value: 'SimSun', label: '宋体', familyName: '宋体' },
    { value: 'SimHei', label: '黑体', familyName: '黑体' },
    { value: 'KaiTi', label: '楷体', familyName: '楷体' },
    { value: 'FangSong', label: '仿宋', familyName: '仿宋' },
    { value: 'Microsoft YaHei', label: '微软雅黑', familyName: '微软雅黑' },
]

export function resolveTypewriterFamilyName(fontName: string): string {
    const found = TYPEWRITER_FONT_OPTIONS.find(
        (o) => o.value === fontName || o.familyName === fontName || o.label === fontName,
    )
    return found?.familyName ?? fontName
}

export function typewriterFontLabel(fontName?: string): string {
    if (!fontName) return '宋体'
    const found = TYPEWRITER_FONT_OPTIONS.find(
        (o) => o.value === fontName || o.familyName === fontName,
    )
    return found?.label ?? fontName
}

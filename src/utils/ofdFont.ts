/** OFD 字体名 → 系统可渲染字体（优先接近印刷体的宋/楷/黑） */

const FONT_ALIASES: Record<string, string> = {
  宋体: 'SimSun',
  新宋体: 'NSimSun',
  黑体: 'SimHei',
  楷体: 'KaiTi',
  楷体_GB2312: 'KaiTi',
  仿宋: 'FangSong',
  仿宋_GB2312: 'FangSong',
  华文楷体: 'KaiTi',
  华文宋体: 'SimSun',
  华文黑体: 'SimHei',
  微软雅黑: 'Microsoft YaHei',
  'Courier New': 'Courier New',
}

export function resolveOfdFontFamily(fontFamily?: string | null): string {
  const name = (fontFamily ?? '').trim()
  if (!name) return 'SimSun'
  return FONT_ALIASES[name] ?? name
}

/** 画布 fontFamily 栈：先 OFD 指定字体，再回退到宋体/雅黑 */
export function buildOfdFontStack(fontFamily?: string | null): string {
  const primary = resolveOfdFontFamily(fontFamily)
  const stack = [primary, 'SimSun', 'KaiTi', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', 'sans-serif']
  return [...new Set(stack.filter(Boolean))].join(', ')
}

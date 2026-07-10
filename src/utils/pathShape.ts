/** 矢量 Path 形状构建与 SVG path 变换（单位：mm） */

export interface PathShapeResult {
  x: number
  y: number
  width: number
  height: number
  pathData: string
  pathLocalCoords: true
}

const KAPPA = 0.5522847498

export function buildRectPathLocal(w: number, h: number): string {
  const ww = Math.max(w, 0.01)
  const hh = Math.max(h, 0.01)
  return `M 0 0 L ${ww} 0 L ${ww} ${hh} L 0 ${hh} Z`
}

export function buildEllipsePathLocal(w: number, h: number): string {
  const ww = Math.max(w, 0.01)
  const hh = Math.max(h, 0.01)
  const rx = ww / 2
  const ry = hh / 2
  const cx = rx
  const cy = ry
  return [
    `M ${cx} ${cy - ry}`,
    `C ${cx + KAPPA * rx} ${cy - ry}, ${cx + rx} ${cy - KAPPA * ry}, ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + KAPPA * ry}, ${cx + KAPPA * rx} ${cy + ry}, ${cx} ${cy + ry}`,
    `C ${cx - KAPPA * rx} ${cy + ry}, ${cx - rx} ${cy + KAPPA * ry}, ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - KAPPA * ry}, ${cx - KAPPA * rx} ${cy - ry}, ${cx} ${cy - ry}`,
    'Z',
  ].join(' ')
}

export function buildLineShape(x1: number, y1: number, x2: number, y2: number): PathShapeResult {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const width = Math.max(Math.abs(x2 - x1), 0.01)
  const height = Math.max(Math.abs(y2 - y1), 0.01)
  return {
    x,
    y,
    width,
    height,
    pathData: `M ${x1 - x} ${y1 - y} L ${x2 - x} ${y2 - y}`,
    pathLocalCoords: true,
  }
}

export function buildRectShape(x: number, y: number, width: number, height: number): PathShapeResult {
  const w = Math.max(width, 0.5)
  const h = Math.max(height, 0.5)
  return {
    x,
    y,
    width: w,
    height: h,
    pathData: buildRectPathLocal(w, h),
    pathLocalCoords: true,
  }
}

export function buildEllipseShape(x: number, y: number, width: number, height: number): PathShapeResult {
  const w = Math.max(width, 0.5)
  const h = Math.max(height, 0.5)
  return {
    x,
    y,
    width: w,
    height: h,
    pathData: buildEllipsePathLocal(w, h),
    pathLocalCoords: true,
  }
}

export interface PointMm {
  x: number
  y: number
}

/** 折线 / 多边形：点序列转局部 path + Boundary */
export function buildPolylineShape(points: PointMm[], closed: boolean): PathShapeResult {
  if (points.length < 2) {
    throw new Error('折线至少需要 2 个点')
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = minX
  let maxY = minY
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const parts = [`M ${points[0].x - minX} ${points[0].y - minY}`]
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x - minX} ${points[i].y - minY}`)
  }
  if (closed) parts.push('Z')
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 0.01),
    height: Math.max(maxY - minY, 0.01),
    pathData: parts.join(' '),
    pathLocalCoords: true,
  }
}

/** 页坐标 SVG path 整体平移（用于旧版解析结果拖拽） */
export function translateSvgPath(pathData: string, dx: number, dy: number): string {
  if (!pathData.trim() || (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6)) return pathData
  const normalized = pathData
      .replace(/,/g, ' ')
      .replace(/([MLCQZAHV])/gi, ' $1 ')
      .trim()
  const tokens = normalized.split(/\s+/)
  const out: string[] = []
  let i = 0
  let cmd: string | null = null
  while (i < tokens.length) {
    const tok = tokens[i]
    if (/^[MLCQZ]$/i.test(tok)) {
      cmd = tok.toUpperCase()
      out.push(cmd)
      i++
      continue
    }
    if (!cmd) {
      i++
      continue
    }
    if (cmd === 'M' || cmd === 'L') {
      if (i + 1 >= tokens.length) break
      const x = parseFloat(tokens[i]) + dx
      const y = parseFloat(tokens[i + 1]) + dy
      out.push(String(x), String(y))
      cmd = 'L'
      i += 2
    } else if (cmd === 'C') {
      if (i + 5 >= tokens.length) break
      for (let k = 0; k < 6; k += 2) {
        out.push(String(parseFloat(tokens[i + k]) + dx))
        out.push(String(parseFloat(tokens[i + k + 1]) + dy))
      }
      i += 6
    } else if (cmd === 'Z') {
      i++
    } else {
      i++
    }
  }
  return out.join(' ')
}

/** 局部 path 随 Boundary 缩放（Transformer 缩放后写回 pathData） */
export function scaleLocalPath(pathData: string, sx: number, sy: number): string {
  if (!pathData.trim()) return pathData
  const normalized = pathData
      .replace(/,/g, ' ')
      .replace(/([MLCQZ])/gi, ' $1 ')
      .trim()
  const tokens = normalized.split(/\s+/)
  const out: string[] = []
  let i = 0
  let cmd: string | null = null
  while (i < tokens.length) {
    const tok = tokens[i]
    if (/^[MLCQZ]$/i.test(tok)) {
      cmd = tok.toUpperCase()
      out.push(cmd)
      i++
      continue
    }
    if (!cmd) {
      i++
      continue
    }
    if (cmd === 'M' || cmd === 'L') {
      if (i + 1 >= tokens.length) break
      out.push(String(parseFloat(tokens[i]) * sx))
      out.push(String(parseFloat(tokens[i + 1]) * sy))
      cmd = 'L'
      i += 2
    } else if (cmd === 'C') {
      if (i + 5 >= tokens.length) break
      for (let k = 0; k < 6; k += 2) {
        out.push(String(parseFloat(tokens[i + k]) * sx))
        out.push(String(parseFloat(tokens[i + k + 1]) * sy))
      }
      i += 6
    } else if (cmd === 'Z') {
      i++
    } else {
      i++
    }
  }
  return out.join(' ')
}

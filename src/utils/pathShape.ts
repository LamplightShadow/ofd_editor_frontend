/** 矢量 Path 形状构建与 SVG path 变换（单位：mm） */

import { scaleLocalPathViaModel, translateSvgPathViaModel } from '@/utils/pathModel'

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

/**
 * 由对角拖拽生成正圆：边长取 max(|dx|,|dy|)，从起点向拖拽象限展开。
 */
export function circleBoundsFromDrag(x1: number, y1: number, x2: number, y2: number): {
  x: number
  y: number
  diameter: number
} {
  const dx = x2 - x1
  const dy = y2 - y1
  const diameter = Math.max(Math.abs(dx), Math.abs(dy), 0.5)
  return {
    x: dx >= 0 ? x1 : x1 - diameter,
    y: dy >= 0 ? y1 : y1 - diameter,
    diameter,
  }
}

export function buildCircleShape(x1: number, y1: number, x2: number, y2: number): PathShapeResult {
  const { x, y, diameter } = circleBoundsFromDrag(x1, y1, x2, y2)
  return buildEllipseShape(x, y, diameter, diameter)
}

export type ArcSign = 1 | -1

/** 页坐标半圆弧 path `d`（两段 90° 三次贝塞尔，直径为 A→B） */
export function buildSemicirclePathPage(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    sign: ArcSign = 1,
): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return `M ${x1} ${y1}`
  const ux = dx / len
  const uy = dy / len
  const nx = -uy * sign
  const ny = ux * sign
  const r = len / 2
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const mid = { x: cx + nx * r, y: cy + ny * r }
  const k = KAPPA * r
  const c1 = { x: x1 + nx * k, y: y1 + ny * k }
  const c2 = { x: mid.x - ux * k, y: mid.y - uy * k }
  const c3 = { x: mid.x + ux * k, y: mid.y + uy * k }
  const c4 = { x: x2 + nx * k, y: y2 + ny * k }
  return [
    `M ${x1} ${y1}`,
    `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${mid.x} ${mid.y}`,
    `C ${c3.x} ${c3.y} ${c4.x} ${c4.y} ${x2} ${y2}`,
  ].join(' ')
}

/**
 * 以 A→B 为直径的半圆弧。
 * sign=+1：弧在有向线段 AB 左侧；-1：右侧。
 */
export function buildSemicircleShape(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    sign: ArcSign = 1,
): PathShapeResult {
  const pagePath = buildSemicirclePathPage(x1, y1, x2, y2, sign)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) {
    return {
      x: x1,
      y: y1,
      width: 0.01,
      height: 0.01,
      pathData: 'M 0 0',
      pathLocalCoords: true,
    }
  }
  const ux = dx / len
  const uy = dy / len
  const nx = -uy * sign
  const ny = ux * sign
  const r = len / 2
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const mid = { x: cx + nx * r, y: cy + ny * r }
  const k = KAPPA * r
  const pts = [
    { x: x1, y: y1 },
    { x: x1 + nx * k, y: y1 + ny * k },
    { x: mid.x - ux * k, y: mid.y - uy * k },
    mid,
    { x: mid.x + ux * k, y: mid.y + uy * k },
    { x: x2 + nx * k, y: y2 + ny * k },
    { x: x2, y: y2 },
  ]
  let minX = pts[0].x
  let minY = pts[0].y
  let maxX = minX
  let maxY = minY
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 0.01),
    height: Math.max(maxY - minY, 0.01),
    pathData: translateSvgPathViaModel(pagePath, -minX, -minY),
    pathLocalCoords: true,
  }
}

/** 直径 AB → 闭合正圆（太极外圆等） */
export function buildCircleFromDiameter(x1: number, y1: number, x2: number, y2: number): PathShapeResult {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const diameter = Math.max(len, 0.5)
  return buildEllipseShape(cx - diameter / 2, cy - diameter / 2, diameter, diameter)
}

/** 指针相对直径 AB 的哪一侧 → 弧方向 */
export function arcSignFromPointer(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    px: number,
    py: number,
): ArcSign {
  const cross = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)
  return cross >= 0 ? 1 : -1
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

/**
 * 正多边形：圆心 + 半径 + 边数。
 * rotationRad 为第一个顶点相对圆心的方位角（默认 -π/2，顶点朝上）。
 */
export function buildRegularPolygonShape(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotationRad = -Math.PI / 2,
): PathShapeResult {
  const n = Math.max(3, Math.min(24, Math.round(sides)))
  const r = Math.max(radius, 0.01)
  const pts: PointMm[] = []
  for (let i = 0; i < n; i++) {
    const a = rotationRad + (i * 2 * Math.PI) / n
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return buildPolylineShape(pts, true)
}

/** 页坐标下正多边形顶点（用于预览） */
export function regularPolygonVertices(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotationRad = -Math.PI / 2,
): PointMm[] {
  const n = Math.max(3, Math.min(24, Math.round(sides)))
  const r = Math.max(radius, 0)
  const pts: PointMm[] = []
  for (let i = 0; i < n; i++) {
    const a = rotationRad + (i * 2 * Math.PI) / n
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return pts
}

/** 页坐标 SVG path 整体平移（PathModel；保留 C） */
export function translateSvgPath(pathData: string, dx: number, dy: number): string {
  return translateSvgPathViaModel(pathData, dx, dy)
}

/** 局部 path 随 Boundary 缩放（PathModel；保留 C） */
export function scaleLocalPath(pathData: string, sx: number, sy: number): string {
  return scaleLocalPathViaModel(pathData, sx, sy)
}

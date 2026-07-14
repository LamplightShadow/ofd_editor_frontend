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

/** 页坐标 SVG path 整体平移（PathModel；保留 C） */
export function translateSvgPath(pathData: string, dx: number, dy: number): string {
  return translateSvgPathViaModel(pathData, dx, dy)
}

/** 局部 path 随 Boundary 缩放（PathModel；保留 C） */
export function scaleLocalPath(pathData: string, sx: number, sy: number): string {
  return scaleLocalPathViaModel(pathData, sx, sy)
}

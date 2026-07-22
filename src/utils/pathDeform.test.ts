import { describe, expect, it } from 'vitest'
import { parsePathModel, getPathBounds, isPathClosed, extractAnchors } from './pathModel'
import {
  warpArcPathModel,
  freeDistortPathModel,
  defaultDistortCorners,
  outlineStrokePathModel,
  closePathModel,
  openPathModel,
  joinPathEnds,
  breakPathAtAnchor,
} from './pathDeform'

describe('warpArcPathModel', () => {
  it('正 bend 使中部 y 上移', () => {
    const m = parsePathModel('M 0 10 L 10 10 L 20 10')
    const warped = warpArcPathModel(m, 0.5, 'arc', true)
    const mid = (warped.commands[1] as { point: { y: number } }).point
    const end = (warped.commands[0] as { point: { y: number } }).point
    expect(mid.y).toBeLessThan(end.y)
  })

  it('bend=0 不变', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 5 Z')
    const warped = warpArcPathModel(m, 0, 'arch')
    expect(getPathBounds(warped).height).toBeCloseTo(getPathBounds(m).height, 5)
  })
})

describe('freeDistortPathModel', () => {
  it('四角不动时近似原样', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 10 L 0 10 Z')
    const corners = defaultDistortCorners(m)
    const d = freeDistortPathModel(m, corners)
    expect(getPathBounds(d).width).toBeCloseTo(10, 4)
  })

  it('拉高右上角后包围盒变高', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 10 L 0 10 Z')
    const corners = defaultDistortCorners(m)
    corners[1] = { x: 10, y: -5 }
    const d = freeDistortPathModel(m, corners)
    expect(getPathBounds(d).height).toBeGreaterThan(10)
  })
})

describe('outlineStrokePathModel', () => {
  it('直线描边得到闭合轮廓且更“厚”', () => {
    const m = parsePathModel('M 0 0 L 20 0')
    const outline = outlineStrokePathModel(m, 2)
    expect(outline).not.toBeNull()
    expect(isPathClosed(outline!)).toBe(true)
    expect(getPathBounds(outline!).height).toBeGreaterThan(1)
  })
})

describe('close / open / join / break', () => {
  it('closePathModel 添加 Z', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 5')
    const closed = closePathModel(m)
    expect(isPathClosed(closed)).toBe(true)
  })

  it('openPathModel 去掉 Z', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 5 Z')
    const opened = openPathModel(m)
    expect(isPathClosed(opened)).toBe(false)
  })

  it('joinPathEnds 闭合开放路径', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 5')
    const r = joinPathEnds(m)
    expect(r.ok).toBe(true)
    expect(isPathClosed(r.model!)).toBe(true)
  })

  it('breakPathAtAnchor 拆分开放路径为两段', () => {
    const m = parsePathModel('M 0 0 L 5 0 L 10 0 L 15 0')
    const r = breakPathAtAnchor(m, 2)
    expect(r.ok).toBe(true)
    expect(extractAnchors(r.primary!).length).toBeGreaterThanOrEqual(2)
    expect(r.secondary).toBeTruthy()
    expect(extractAnchors(r.secondary!).length).toBeGreaterThanOrEqual(2)
  })
})

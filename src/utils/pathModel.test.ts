import { describe, expect, it } from 'vitest'
import {
  parsePathModel,
  serializePathModel,
  pathModelsEqual,
  translatePathModel,
  scalePathModel,
  normalizeLegacyPath,
  normalizeElementPathIfNeeded,
  hasCubicSegments,
  countCommands,
  getPathBounds,
  translateSvgPathViaModel,
  scaleLocalPathViaModel,
  extractAnchors,
  translateAnchors,
  insertMidpointOnSegment,
  deleteAnchors,
  rebakeLocalPath,
  isPathClosed,
  findNearestStraightSegment,
  extractHandles,
  moveHandle,
  inferAnchorSmoothMode,
  cycleAnchorSmoothMode,
  buildPathFromPenKnots,
  buildPenPreviewModel,
  mirrorHandle,
} from './pathModel'
import { buildEllipsePathLocal, buildRectPathLocal } from './pathShape'

describe('PathModel P0-1 M/L 解析与序列化', () => {
  it('解析简单折线 M/L', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 5')
    expect(countCommands(m)).toEqual({ M: 1, L: 2, C: 0, Z: 0 })
    expect(m.commands[0]).toEqual({ type: 'M', point: { x: 0, y: 0 } })
    expect(m.commands[2]).toEqual({ type: 'L', point: { x: 10, y: 5 } })
  })

  it('隐式续写 L', () => {
    const m = parsePathModel('M 1 2 3 4 5 6')
    expect(m.commands).toHaveLength(3)
    expect(m.commands.map(c => c.type)).toEqual(['M', 'L', 'L'])
  })

  it('闭合 Z', () => {
    const m = parsePathModel('M 0 0 L 1 0 L 1 1 Z')
    expect(m.commands.at(-1)).toEqual({ type: 'Z' })
  })

  it('M/L 往返一致', () => {
    const src = 'M 0 0 L 12.5 0 L 12.5 8 L 0 8 Z'
    const again = serializePathModel(parsePathModel(src))
    expect(pathModelsEqual(parsePathModel(src), parsePathModel(again))).toBe(true)
  })

  it('空 / 非法输入得到空模型', () => {
    expect(parsePathModel('').commands).toHaveLength(0)
    expect(parsePathModel('   ').commands).toHaveLength(0)
  })
})

describe('PathModel P0-4 曲线 C 保留', () => {
  it('解析并序列化 C 段', () => {
    const src = 'M 0 0 C 1 2 3 4 5 6'
    const m = parsePathModel(src)
    expect(hasCubicSegments(m)).toBe(true)
    expect(m.commands[1]).toMatchObject({
      type: 'C',
      cp1: { x: 1, y: 2 },
      cp2: { x: 3, y: 4 },
      end: { x: 5, y: 6 },
    })
    const again = serializePathModel(m)
    expect(pathModelsEqual(m, parsePathModel(again))).toBe(true)
  })

  it('椭圆 path（4×C）往返不丢曲线', () => {
    const ellipse = buildEllipsePathLocal(20, 10)
    const m = parsePathModel(ellipse)
    expect(countCommands(m).C).toBe(4)
    expect(hasCubicSegments(serializePathModel(m) ? m : m)).toBe(true)
    expect(pathModelsEqual(m, parsePathModel(serializePathModel(m)))).toBe(true)
  })

  it('平移后仍保留 C', () => {
    const m = parsePathModel('M 10 10 C 12 10 14 12 14 14')
    const t = translatePathModel(m, 5, -2)
    expect(hasCubicSegments(t)).toBe(true)
    expect(t.commands[1]).toMatchObject({
      type: 'C',
      end: { x: 19, y: 12 },
    })
  })

  it('缩放后仍保留 C（不降级为折线）', () => {
    const m = parsePathModel('M 0 0 C 2 0 4 2 4 4')
    const s = scalePathModel(m, 2, 0.5)
    expect(countCommands(s).C).toBe(1)
    expect(countCommands(s).L).toBe(0)
    expect(s.commands[1]).toMatchObject({
      type: 'C',
      cp1: { x: 4, y: 0 },
      end: { x: 8, y: 2 },
    })
  })

  it('字符串级 scaleLocalPathViaModel 保留椭圆 C 段数', () => {
    const ellipse = buildEllipsePathLocal(40, 20)
    const scaled = scaleLocalPathViaModel(ellipse, 1.5, 1.5)
    expect(countCommands(parsePathModel(scaled)).C).toBe(4)
  })
})

describe('PathModel P0-3 normalizeLegacyPath', () => {
  it('页坐标折线 → 局部坐标 + Boundary', () => {
    const r = normalizeLegacyPath('M 100 50 L 120 50 L 120 70 Z')
    expect(r).not.toBeNull()
    expect(r!.pathLocalCoords).toBe(true)
    expect(r!.x).toBe(100)
    expect(r!.y).toBe(50)
    expect(r!.width).toBeCloseTo(20, 5)
    expect(r!.height).toBeCloseTo(20, 5)
    const local = parsePathModel(r!.pathData)
    expect(local.commands[0]).toEqual({ type: 'M', point: { x: 0, y: 0 } })
    expect(local.commands[1]).toEqual({ type: 'L', point: { x: 20, y: 0 } })
  })

  it('含 C 的旧路径规范化不丢曲线', () => {
    const r = normalizeLegacyPath('M 30 40 C 35 40 40 45 40 50')
    expect(r).not.toBeNull()
    expect(hasCubicSegments(parsePathModel(r!.pathData))).toBe(true)
    expect(countCommands(parsePathModel(r!.pathData)).C).toBe(1)
  })

  it('已是 pathLocalCoords 时 normalizeElementPathIfNeeded 返回 null', () => {
    const r = normalizeElementPathIfNeeded({
      type: 'PATH',
      pathData: buildRectPathLocal(10, 8),
      pathLocalCoords: true,
      x: 0,
      y: 0,
      width: 10,
      height: 8,
    })
    expect(r).toBeNull()
  })

  it('页坐标元素可规范化', () => {
    const r = normalizeElementPathIfNeeded({
      type: 'PATH',
      pathData: 'M 5 5 L 15 5 L 15 15',
      pathLocalCoords: false,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    })
    expect(r).not.toBeNull()
    expect(r!.pathLocalCoords).toBe(true)
    expect(r!.x).toBe(5)
    expect(r!.y).toBe(5)
  })

  it('包围盒计算包含控制点', () => {
    const b = getPathBounds(parsePathModel('M 0 0 C 0 10 10 10 10 0'))
    expect(b.y).toBe(0)
    expect(b.height).toBeGreaterThanOrEqual(10)
  })

  it('translateSvgPathViaModel 平移页坐标', () => {
    const out = translateSvgPathViaModel('M 1 2 L 3 4', 10, 20)
    expect(pathModelsEqual(parsePathModel(out), parsePathModel('M 11 22 L 13 24'))).toBe(true)
  })
})

describe('PathModel P1 锚点编辑', () => {
  it('extractAnchors 提取折线顶点', () => {
    const a = extractAnchors(parsePathModel('M 0 0 L 10 0 L 10 5 Z'))
    expect(a).toHaveLength(3)
    expect(isPathClosed(parsePathModel('M 0 0 L 10 0 L 10 5 Z'))).toBe(true)
  })

  it('translateAnchors 批量平移并保留其余点', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 10')
    const t = translateAnchors(m, [1], 2, 3)
    expect(t.commands[0]).toEqual({ type: 'M', point: { x: 0, y: 0 } })
    expect(t.commands[1]).toEqual({ type: 'L', point: { x: 12, y: 3 } })
    expect(t.commands[2]).toEqual({ type: 'L', point: { x: 10, y: 10 } })
  })

  it('insertMidpointOnSegment 在 L 段中点插点', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 10')
    const next = insertMidpointOnSegment(m, 0)
    expect(next).not.toBeNull()
    expect(extractAnchors(next!).map(a => a.point)).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
  })

  it('insertMidpointOnSegment 拒绝 C 段', () => {
    const m = parsePathModel('M 0 0 C 2 0 4 2 4 4')
    expect(insertMidpointOnSegment(m, 0)).toBeNull()
  })

  it('deleteAnchors 开放路径至少 2 点', () => {
    const m = parsePathModel('M 0 0 L 10 0')
    const r = deleteAnchors(m, [1])
    expect(r.ok).toBe(false)
  })

  it('deleteAnchors 闭合路径至少 3 点', () => {
    const tri = parsePathModel('M 0 0 L 10 0 L 10 10 Z')
    expect(deleteAnchors(tri, [2]).ok).toBe(false) // 剩 2 < 3
    const quad = parsePathModel('M 0 0 L 10 0 L 10 10 L 0 10 Z')
    expect(deleteAnchors(quad, [0, 1]).ok).toBe(false)
    const r = deleteAnchors(quad, [3])
    expect(r.ok).toBe(true)
    expect(extractAnchors(r.model!).length).toBe(3)
  })

  it('rebakeLocalPath 重贴原点', () => {
    const m = parsePathModel('M 2 3 L 12 3')
    const baked = rebakeLocalPath(m, 100, 50)
    expect(baked.x).toBe(102)
    expect(baked.y).toBe(53)
    expect(baked.pathLocalCoords).toBe(true)
    expect(parsePathModel(baked.pathData).commands[0]).toEqual({ type: 'M', point: { x: 0, y: 0 } })
  })

  it('findNearestStraightSegment 命中', () => {
    const m = parsePathModel('M 0 0 L 10 0 L 10 10')
    expect(findNearestStraightSegment(m, 5, 0.2, 1)).toBe(0)
    expect(findNearestStraightSegment(m, 5, 5, 0.5)).toBeNull()
  })
})

describe('PathModel P2 贝塞尔手柄', () => {
  const curve = () => parsePathModel('M 0 0 C 10 0 10 10 0 10')

  it('extractHandles 绑定 out/in 到起止锚点', () => {
    const hs = extractHandles(curve())
    expect(hs).toHaveLength(2)
    expect(hs.find(h => h.which === 'cp1')?.anchorIndex).toBe(0)
    expect(hs.find(h => h.which === 'cp2')?.anchorIndex).toBe(1)
    expect(hs.find(h => h.which === 'cp1')?.role).toBe('out')
    expect(hs.find(h => h.which === 'cp2')?.role).toBe('in')
  })

  it('moveHandle corner 只改一侧', () => {
    const m = curve()
    const id = extractHandles(m).find(h => h.which === 'cp1')!.id
    const next = moveHandle(m, id, { x: 20, y: 0 }, 'corner')
    const c = next.commands[1]
    expect(c.type).toBe('C')
    if (c.type === 'C') {
      expect(c.cp1).toEqual({ x: 20, y: 0 })
      expect(c.cp2).toEqual({ x: 10, y: 10 })
    }
  })

  it('moveHandle symmetric 对侧等长反向', () => {
    // 锚点 1 仅有 in；在中间点造双侧：M-C-C
    const m = parsePathModel('M 0 0 C 5 5 15 5 20 0 C 25 -5 35 -5 40 0')
    // 锚点 1 = 第一段 C 终点 (20,0)，有 in(cp2 of cmd1) 与 out(cp1 of cmd2)
    const hs = extractHandles(m)
    const out = hs.find(h => h.anchorIndex === 1 && h.role === 'out')!
    const next = moveHandle(m, out.id, { x: 20, y: 10 }, 'symmetric')
    const inH = extractHandles(next).find(h => h.anchorIndex === 1 && h.role === 'in')!
    expect(inH.point.x).toBeCloseTo(20, 5)
    expect(inH.point.y).toBeCloseTo(-10, 5)
    expect(inferAnchorSmoothMode(next, 1)).toBe('symmetric')
  })

  it('translateAnchors 只带动所属手柄', () => {
    const m = curve()
    const t = translateAnchors(m, [1], 0, 5) // 移动终点
    const c = t.commands[1]
    expect(c.type).toBe('C')
    if (c.type === 'C') {
      expect(c.end).toEqual({ x: 0, y: 15 })
      expect(c.cp2).toEqual({ x: 10, y: 15 }) // in 随终点
      expect(c.cp1).toEqual({ x: 10, y: 0 })  // out 仍属起点
    }
  })

  it('cycleAnchorSmoothMode 可循环', () => {
    const m = parsePathModel('M 0 0 C 5 5 15 5 20 0 C 25 -5 35 -5 40 0')
    expect(inferAnchorSmoothMode(m, 1)).toBe('symmetric')
    const r1 = cycleAnchorSmoothMode(m, 1)
    expect(r1.mode).toBe('corner')
    expect(inferAnchorSmoothMode(r1.model, 1)).toBe('corner')
    const r2 = cycleAnchorSmoothMode(r1.model, 1)
    expect(['smooth', 'symmetric']).toContain(r2.mode)
    expect(inferAnchorSmoothMode(r2.model, 1)).not.toBe('corner')
  })
})

describe('PathModel P2-2 钢笔贝塞尔', () => {
  it('无柄结点生成折线 M/L', () => {
    const m = buildPathFromPenKnots([
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null },
      { point: { x: 10, y: 0 }, inHandle: null, outHandle: null },
      { point: { x: 10, y: 5 }, inHandle: null, outHandle: null },
    ], false)
    expect(m.commands.map(c => c.type)).toEqual(['M', 'L', 'L'])
  })

  it('有出/入柄生成 C 段', () => {
    const m = buildPathFromPenKnots([
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: { x: 5, y: 0 } },
      { point: { x: 20, y: 0 }, inHandle: { x: 15, y: 0 }, outHandle: null },
    ], false)
    expect(m.commands[1]).toEqual({
      type: 'C',
      cp1: { x: 5, y: 0 },
      cp2: { x: 15, y: 0 },
      end: { x: 20, y: 0 },
    })
  })

  it('闭合时追加回到起点的段 + Z', () => {
    const m = buildPathFromPenKnots([
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null },
      { point: { x: 10, y: 0 }, inHandle: null, outHandle: null },
      { point: { x: 5, y: 8 }, inHandle: null, outHandle: null },
    ], true)
    expect(m.commands.map(c => c.type)).toEqual(['M', 'L', 'L', 'L', 'Z'])
  })

  it('mirrorHandle 对称', () => {
    expect(mirrorHandle({ x: 10, y: 10 }, { x: 14, y: 10 })).toEqual({ x: 6, y: 10 })
  })

  it('buildPenPreviewModel 含橡皮筋', () => {
    const m = buildPenPreviewModel(
      [{ point: { x: 0, y: 0 }, inHandle: null, outHandle: null }],
      { x: 5, y: 5 },
      null,
    )
    expect(m.commands).toHaveLength(2)
    expect(m.commands[1]).toEqual({ type: 'L', point: { x: 5, y: 5 } })
  })
})

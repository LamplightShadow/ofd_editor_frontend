/**
 * 路径变形 / 轮廓化描边 / 开闭与连接。
 * 单位与 PathModel 一致：毫米 (mm)。
 */
import {
  type PathModel,
  type PathPoint,
  type PathCommand,
  parsePathModel,
  serializePathModel,
  getPathBounds,
  isPathClosed,
  extractAnchors,
  samplePathToPolyline,
  offsetPolyline,
  clonePathCommands,
} from './pathModel'

function mapPoints(model: PathModel, fn: (p: PathPoint) => PathPoint): PathModel {
  return {
    commands: model.commands.map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return { type: c.type, point: fn(c.point) }
        case 'C':
          return {
            type: 'C' as const,
            cp1: fn(c.cp1),
            cp2: fn(c.cp2),
            end: fn(c.end),
          }
        case 'Z':
          return c
      }
    }),
  }
}

function lerp(a: PathPoint, b: PathPoint, t: number): PathPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export type WarpArcStyle = 'arc' | 'arch'

/**
 * 弧形 / 拱形封套。
 * bend ∈ [-1, 1]：正=上拱，负=下拱；|bend| 越大弯曲越强。
 * horizontal=true 时沿水平方向弯曲（改 y）；false 时沿竖直方向弯曲（改 x）。
 * arch 比 arc 峰值更尖（用 sin^1.5 近似）。
 */
export function warpArcPathModel(
    model: PathModel,
    bend: number,
    style: WarpArcStyle = 'arc',
    horizontal = true,
): PathModel {
  const b = Math.max(-1, Math.min(1, bend))
  if (Math.abs(b) < 1e-6) return model
  const bounds = getPathBounds(model)
  const w = Math.max(bounds.width, 1e-6)
  const h = Math.max(bounds.height, 1e-6)
  const amp = (horizontal ? h : w) * 0.5 * b

  return mapPoints(model, (p) => {
    if (horizontal) {
      const t = (p.x - bounds.x) / w
      const wave = Math.sin(Math.PI * Math.max(0, Math.min(1, t)))
      const k = style === 'arch' ? Math.pow(wave, 1.35) : wave
      return { x: p.x, y: p.y - amp * k }
    }
    const t = (p.y - bounds.y) / h
    const wave = Math.sin(Math.PI * Math.max(0, Math.min(1, t)))
    const k = style === 'arch' ? Math.pow(wave, 1.35) : wave
    return { x: p.x + amp * k, y: p.y }
  })
}

/** 四角：TL, TR, BR, BL（目标局部坐标） */
export type FreeDistortCorners = [PathPoint, PathPoint, PathPoint, PathPoint]

/** 由包围盒生成默认四角 */
export function defaultDistortCorners(model: PathModel): FreeDistortCorners {
  const b = getPathBounds(model)
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ]
}

/**
 * 双线性自由变形：将原包围盒内一点映射到四角四边形。
 * corners 顺序：TL, TR, BR, BL。
 */
export function freeDistortPathModel(
    model: PathModel,
    corners: FreeDistortCorners,
): PathModel {
  const b = getPathBounds(model)
  const w = Math.max(b.width, 1e-6)
  const h = Math.max(b.height, 1e-6)
  const [tl, tr, br, bl] = corners

  return mapPoints(model, (p) => {
    const u = (p.x - b.x) / w
    const v = (p.y - b.y) / h
    const top = lerp(tl, tr, u)
    const bot = lerp(bl, br, u)
    return lerp(top, bot, v)
  })
}

function polylineToClosedRing(points: PathPoint[]): PathModel {
  if (points.length === 0) return { commands: [] }
  const commands: PathCommand[] = [{ type: 'M', point: { ...points[0] } }]
  for (let i = 1; i < points.length; i++) {
    commands.push({ type: 'L', point: { ...points[i] } })
  }
  commands.push({ type: 'Z' })
  return { commands }
}

function appendRoundCap(
    out: PathPoint[],
    center: PathPoint,
    fromDir: PathPoint,
    radius: number,
    ccw: boolean,
    steps = 8,
): void {
  const len = Math.hypot(fromDir.x, fromDir.y) || 1
  const nx = fromDir.x / len
  const ny = fromDir.y / len
  // 起点法向（左侧）
  let a0 = Math.atan2(ny, nx) + (ccw ? -Math.PI / 2 : Math.PI / 2)
  const sweep = ccw ? Math.PI : -Math.PI
  for (let i = 1; i <= steps; i++) {
    const a = a0 + (sweep * i) / steps
    out.push({
      x: center.x + Math.cos(a) * radius,
      y: center.y + Math.sin(a) * radius,
    })
  }
}

/**
 * 轮廓化描边：将中心线路径变为可填充的描边轮廓（闭合环）。
 * widthMm 为全宽；open 路径两端做圆头近似。
 */
export function outlineStrokePathModel(
    model: PathModel,
    widthMm: number,
    opts?: { stepsPerCubic?: number },
): PathModel | null {
  const width = Math.max(0.05, widthMm)
  const half = width / 2
  const { points, closed } = samplePathToPolyline(model, opts?.stepsPerCubic ?? 10)
  if (points.length < 2) return null

  const left = offsetPolyline(points, half, closed)
  const right = offsetPolyline(points, -half, closed)
  if (left.length < 2 || right.length < 2) return null

  if (closed) {
    // 外环：left；内环用 evenodd 较复杂，这里合成单一外轮廓（left 正向 + right 反向）
    const ring = [...left, ...[...right].reverse()]
    return polylineToClosedRing(ring)
  }

  // 开放：左正向 → 末端圆帽 → 右反向 → 起点圆帽
  const out: PathPoint[] = [...left]
  const pLast = points[points.length - 1]
  const pPrev = points[points.length - 2]
  appendRoundCap(out, pLast, { x: pLast.x - pPrev.x, y: pLast.y - pPrev.y }, half, true)
  out.push(...[...right].reverse())
  const pFirst = points[0]
  const pNext = points[1]
  appendRoundCap(out, pFirst, { x: pFirst.x - pNext.x, y: pFirst.y - pNext.y }, half, true)
  return polylineToClosedRing(out)
}

/** 闭合开放路径（末点若不重合则连回起点，再加 Z） */
export function closePathModel(model: PathModel): PathModel {
  if (isPathClosed(model)) return model
  const anchors = extractAnchors(model)
  if (anchors.length < 2) return model
  const commands = clonePathCommands(model)
  const first = anchors[0].point
  const last = anchors[anchors.length - 1].point
  if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-4) {
    commands.push({ type: 'L', point: { ...first } })
  }
  commands.push({ type: 'Z' })
  return { commands }
}

/** 打开闭合路径：去掉 Z；若末点与起点重合的显式 L 也去掉 */
export function openPathModel(model: PathModel): PathModel {
  if (!isPathClosed(model)) return model
  const commands = clonePathCommands(model).filter((c) => c.type !== 'Z')
  const anchors = extractAnchors({ commands })
  if (anchors.length >= 2) {
    const first = anchors[0].point
    const last = anchors[anchors.length - 1]
    if (
      Math.hypot(first.x - last.point.x, first.y - last.point.y) < 1e-4
      && commands[last.commandIndex]?.type === 'L'
    ) {
      commands.splice(last.commandIndex, 1)
    }
  }
  return { commands }
}

/**
 * 连接：若选中开放路径的首尾两个锚点（或仅两端），将两端合并并闭合。
 * selectedIndices 为空时默认连接首尾。
 */
export function joinPathEnds(
    model: PathModel,
    selectedIndices?: number[],
): { ok: boolean; model?: PathModel; message?: string } {
  if (isPathClosed(model)) {
    return { ok: false, message: '路径已闭合' }
  }
  const anchors = extractAnchors(model)
  if (anchors.length < 2) {
    return { ok: false, message: '锚点不足' }
  }
  const first = 0
  const last = anchors.length - 1
  if (selectedIndices && selectedIndices.length >= 2) {
    const set = new Set(selectedIndices)
    if (!set.has(first) || !set.has(last)) {
      return { ok: false, message: '请选中开放路径的首尾锚点以连接' }
    }
  }
  // 将末点移到起点，再闭合
  const commands = clonePathCommands(model)
  const aLast = anchors[last]
  const aFirst = anchors[first]
  const c = commands[aLast.commandIndex]
  if (c.type === 'M' || c.type === 'L') {
    c.point = { ...aFirst.point }
  } else if (c.type === 'C') {
    c.end = { ...aFirst.point }
  }
  commands.push({ type: 'Z' })
  return { ok: true, model: { commands } }
}

/**
 * 在选中锚点处断开：
 * - 闭合路径：去掉 Z，并旋转命令使该锚点成为新起点（开放）
 * - 开放路径：在该点拆成两段，返回第二段（调用方负责生成新元素）；第一段写回
 */
export function breakPathAtAnchor(
    model: PathModel,
    anchorIndex: number,
): {
  ok: boolean
  message?: string
  /** 断开后保留的前半（或打开后的整条） */
  primary?: PathModel
  /** 开放路径断开时的后半段；闭合打开时为 null */
  secondary?: PathModel | null
} {
  const anchors = extractAnchors(model)
  if (anchorIndex < 0 || anchorIndex >= anchors.length) {
    return { ok: false, message: '锚点无效' }
  }

  if (isPathClosed(model)) {
    // 打开并旋转到该锚点为起点
    const opened = openPathModel(model)
    const a2 = extractAnchors(opened)
    if (a2.length < 2) return { ok: false, message: '无法断开' }
    const idx = Math.min(anchorIndex, a2.length - 1)
    const cmds = clonePathCommands(opened)
    // 按锚点切分命令：从该锚点的 commandIndex 起作为新 M
    const startCmd = a2[idx].commandIndex
    const rotated: PathCommand[] = []
    const startPt = a2[idx].point
    rotated.push({ type: 'M', point: { ...startPt } })
    for (let i = startCmd + 1; i < cmds.length; i++) {
      const c = cmds[i]
      if (c.type === 'Z') continue
      rotated.push(JSON.parse(JSON.stringify(c)))
    }
    for (let i = 1; i <= startCmd; i++) {
      const c = cmds[i]
      if (c.type === 'Z' || c.type === 'M') continue
      rotated.push(JSON.parse(JSON.stringify(c)))
    }
    return { ok: true, primary: { commands: rotated }, secondary: null }
  }

  // 开放路径：拆成两段
  if (anchorIndex <= 0 || anchorIndex >= anchors.length - 1) {
    return { ok: false, message: '请选择中间锚点以拆分开放路径' }
  }
  const a = anchors[anchorIndex]
  const cmds = clonePathCommands(model)
  const primaryCmds = cmds.slice(0, a.commandIndex + 1)
  const rest = cmds.slice(a.commandIndex + 1)
  if (rest.length === 0) return { ok: false, message: '无法拆分' }
  const secondaryCmds: PathCommand[] = [
    { type: 'M', point: { ...a.point } },
    ...rest.map((c) => JSON.parse(JSON.stringify(c)) as PathCommand),
  ]
  // 若 primary 以 C 结束于该点，已包含；若以 M/L 结束于该点，OK
  return {
    ok: true,
    primary: { commands: primaryCmds },
    secondary: { commands: secondaryCmds },
  }
}

export function serializeDeformed(model: PathModel): string {
  return serializePathModel(model)
}

export function parseForDeform(pathData: string): PathModel {
  return parsePathModel(pathData)
}

/**
 * PathModel：SVG path `d` 的结构化解析 / 序列化 / 变换。
 * P0：M/L 地基 + C 段保留 + 旧路径规范化为 pathLocalCoords。
 * 单位与 ElementData 一致：毫米 (mm)。
 */

export type PathCommandType = 'M' | 'L' | 'C' | 'Z'

export interface PathPoint {
  x: number
  y: number
}

/** 三次贝塞尔：终点 + 两个控制点 */
export interface PathCubic {
  type: 'C'
  /** 控制点 1 */
  cp1: PathPoint
  /** 控制点 2 */
  cp2: PathPoint
  /** 终点 */
  end: PathPoint
}

export type PathCommand =
  | { type: 'M'; point: PathPoint }
  | { type: 'L'; point: PathPoint }
  | PathCubic
  | { type: 'Z' }

export interface PathModel {
  commands: PathCommand[]
}

export interface PathBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface NormalizeLegacyResult {
  pathData: string
  x: number
  y: number
  width: number
  height: number
  pathLocalCoords: true
}

const CMD_RE = /^[MLCZ]$/i

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const r = Math.round(n * 1e6) / 1e6
  return String(r)
}

function isCmd(tok: string): boolean {
  return tok.length === 1 && CMD_RE.test(tok)
}

/**
 * 解析 SVG path `d`（支持绝对 M/L/C/Z；隐式续写 L/C）。
 * 相对命令与 Q/A/H/V 当前跳过（不降级为折线，也不伪造）。
 */
export function parsePathModel(pathData: string): PathModel {
  const commands: PathCommand[] = []
  if (!pathData?.trim()) return { commands }

  const normalized = pathData
      .replace(/,/g, ' ')
      .replace(/([MLCQZAHV])/gi, ' $1 ')
      .trim()
  const tokens = normalized.split(/\s+/).filter(Boolean)

  let i = 0
  let pending: string | null = null

  while (i < tokens.length) {
    const tok = tokens[i]
    let cmd: string
    if (isCmd(tok) || /^[QAHV]$/i.test(tok)) {
      cmd = tok.toUpperCase()
      i++
    } else if (pending) {
      cmd = pending
    } else {
      i++
      continue
    }

    if (cmd === 'M' || cmd === 'L') {
      if (i + 1 >= tokens.length) break
      const x = parseFloat(tokens[i])
      const y = parseFloat(tokens[i + 1])
      if (!Number.isFinite(x) || !Number.isFinite(y)) break
      commands.push({ type: cmd as 'M' | 'L', point: { x, y } })
      pending = 'L'
      i += 2
    } else if (cmd === 'C') {
      if (i + 5 >= tokens.length) break
      const nums = tokens.slice(i, i + 6).map(parseFloat)
      if (nums.some(n => !Number.isFinite(n))) break
      commands.push({
        type: 'C',
        cp1: { x: nums[0], y: nums[1] },
        cp2: { x: nums[2], y: nums[3] },
        end: { x: nums[4], y: nums[5] },
      })
      pending = 'C'
      i += 6
    } else if (cmd === 'Z') {
      commands.push({ type: 'Z' })
      pending = null
    } else {
      // Q/A/H/V：跳过整段参数，避免误解析为折线
      pending = null
      if (cmd === 'Q') i += 4
      else if (cmd === 'A') i += 7
      else if (cmd === 'H' || cmd === 'V') i += 1
      else i++
    }
  }

  return { commands }
}

/** 序列化为 SVG path `d`（仅输出已建模的 M/L/C/Z） */
export function serializePathModel(model: PathModel): string {
  const parts: string[] = []
  for (const c of model.commands) {
    switch (c.type) {
      case 'M':
        parts.push(`M ${fmt(c.point.x)} ${fmt(c.point.y)}`)
        break
      case 'L':
        parts.push(`L ${fmt(c.point.x)} ${fmt(c.point.y)}`)
        break
      case 'C':
        parts.push(
            `C ${fmt(c.cp1.x)} ${fmt(c.cp1.y)} ${fmt(c.cp2.x)} ${fmt(c.cp2.y)} ${fmt(c.end.x)} ${fmt(c.end.y)}`,
        )
        break
      case 'Z':
        parts.push('Z')
        break
    }
  }
  return parts.join(' ')
}

/** 是否包含三次贝塞尔 C 段 */
export function hasCubicSegments(model: PathModel): boolean {
  return model.commands.some(c => c.type === 'C')
}

/** 统计命令类型 */
export function countCommands(model: PathModel): Record<PathCommandType, number> {
  const out: Record<PathCommandType, number> = { M: 0, L: 0, C: 0, Z: 0 }
  for (const c of model.commands) out[c.type]++
  return out
}

function collectPoints(model: PathModel): PathPoint[] {
  const pts: PathPoint[] = []
  for (const c of model.commands) {
    if (c.type === 'M' || c.type === 'L') pts.push(c.point)
    else if (c.type === 'C') {
      pts.push(c.cp1, c.cp2, c.end)
    }
  }
  return pts
}

/** 由控制点估算包围盒（对 C 取端点+控制点，略保守） */
export function getPathBounds(model: PathModel): PathBounds {
  const pts = collectPoints(model)
  if (pts.length === 0) return { x: 0, y: 0, width: 0.01, height: 0.01 }
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
  }
}

function mapPoints(model: PathModel, fn: (p: PathPoint) => PathPoint): PathModel {
  return {
    commands: model.commands.map(c => {
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

/** 平移（保留 C） */
export function translatePathModel(model: PathModel, dx: number, dy: number): PathModel {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return model
  return mapPoints(model, p => ({ x: p.x + dx, y: p.y + dy }))
}

/** 相对原点缩放（保留 C） */
export function scalePathModel(model: PathModel, sx: number, sy: number): PathModel {
  if (Math.abs(sx - 1) < 1e-9 && Math.abs(sy - 1) < 1e-9) return model
  return mapPoints(model, p => ({ x: p.x * sx, y: p.y * sy }))
}

/**
 * 旧路径规范化：页坐标（或任意绝对坐标）path → 局部 path + Boundary。
 * 不丢弃 C 段；结果 `pathLocalCoords: true`。
 */
export function normalizeLegacyPath(
    pathData: string,
    existingBoundary?: { x: number; y: number; width: number; height: number },
): NormalizeLegacyResult | null {
  const model = parsePathModel(pathData)
  if (model.commands.length === 0) return null

  const bounds = getPathBounds(model)
  const originX = bounds.x
  const originY = bounds.y
  const local = translatePathModel(model, -originX, -originY)

  // 几何包围盒为准；若调用方传入更大 Boundary，保留较大宽高以免裁切描边
  const width = Math.max(bounds.width, existingBoundary?.width ?? 0, 0.01)
  const height = Math.max(bounds.height, existingBoundary?.height ?? 0, 0.01)

  return {
    pathData: serializePathModel(local),
    x: originX,
    y: originY,
    width,
    height,
    pathLocalCoords: true,
  }
}

/**
 * 若元素仍为页坐标 PATH，规范化为 pathLocalCoords。
 * 已是局部坐标则原样返回 null（表示无需更新）。
 */
export function normalizeElementPathIfNeeded(el: {
  type?: string
  pathData?: string
  pathLocalCoords?: boolean
  x: number
  y: number
  width?: number
  height?: number
}): NormalizeLegacyResult | null {
  if (el.type !== 'PATH' || !el.pathData?.trim()) return null
  if (el.pathLocalCoords === true) return null
  return normalizeLegacyPath(el.pathData, {
    x: el.x,
    y: el.y,
    width: el.width ?? 0,
    height: el.height ?? 0,
  })
}

/** 字符串级平移（兼容旧调用；内部走 PathModel，保留 C） */
export function translateSvgPathViaModel(pathData: string, dx: number, dy: number): string {
  if (!pathData.trim() || (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6)) return pathData
  return serializePathModel(translatePathModel(parsePathModel(pathData), dx, dy))
}

/** 字符串级缩放（兼容旧调用；内部走 PathModel，保留 C） */
export function scaleLocalPathViaModel(pathData: string, sx: number, sy: number): string {
  if (!pathData.trim()) return pathData
  return serializePathModel(scalePathModel(parsePathModel(pathData), sx, sy))
}

/** M/L 往返一致性校验（忽略空白与数值格式） */
export function pathModelsEqual(a: PathModel, b: PathModel, eps = 1e-4): boolean {
  if (a.commands.length !== b.commands.length) return false
  for (let i = 0; i < a.commands.length; i++) {
    const ca = a.commands[i]
    const cb = b.commands[i]
    if (ca.type !== cb.type) return false
    if (ca.type === 'Z') continue
    if (ca.type === 'M' || ca.type === 'L') {
      if (cb.type !== ca.type) return false
      if (Math.abs(ca.point.x - cb.point.x) > eps || Math.abs(ca.point.y - cb.point.y) > eps) {
        return false
      }
    } else if (ca.type === 'C' && cb.type === 'C') {
      const pairs: [PathPoint, PathPoint][] = [
        [ca.cp1, cb.cp1],
        [ca.cp2, cb.cp2],
        [ca.end, cb.end],
      ]
      for (const [p, q] of pairs) {
        if (Math.abs(p.x - q.x) > eps || Math.abs(p.y - q.y) > eps) return false
      }
    }
  }
  return true
}

// ─── P1 锚点编辑 ───────────────────────────────────────────

export interface PathAnchor {
  /** 顶点序号 0..n-1 */
  index: number
  /** 对应 commands 下标 */
  commandIndex: number
  /** 局部坐标点 */
  point: PathPoint
  /** M/L 顶点或 C 终点 */
  kind: 'ML' | 'C_END'
}

export function isPathClosed(model: PathModel): boolean {
  return model.commands.some(c => c.type === 'Z')
}

/** 可编辑角点（M/L 点 + C 终点；不含贝塞尔控制柄） */
export function extractAnchors(model: PathModel): PathAnchor[] {
  const anchors: PathAnchor[] = []
  model.commands.forEach((c, commandIndex) => {
    if (c.type === 'M' || c.type === 'L') {
      anchors.push({
        index: anchors.length,
        commandIndex,
        point: { x: c.point.x, y: c.point.y },
        kind: 'ML',
      })
    } else if (c.type === 'C') {
      anchors.push({
        index: anchors.length,
        commandIndex,
        point: { x: c.end.x, y: c.end.y },
        kind: 'C_END',
      })
    }
  })
  return anchors
}

/**
 * 将编辑后的局部 path 重新贴齐 Boundary 原点，返回写回 Element 的字段。
 * `originX/Y` 为元素当前 Boundary 左上（页坐标 mm）。
 */
export function rebakeLocalPath(
    model: PathModel,
    originX: number,
    originY: number,
): { pathData: string; x: number; y: number; width: number; height: number; pathLocalCoords: true } {
  const bounds = getPathBounds(model)
  const local = translatePathModel(model, -bounds.x, -bounds.y)
  return {
    pathData: serializePathModel(local),
    x: originX + bounds.x,
    y: originY + bounds.y,
    width: bounds.width,
    height: bounds.height,
    pathLocalCoords: true,
  }
}

/** 批量平移选中锚点（局部坐标 delta）；所属控制柄同步平移 */
export function translateAnchors(
    model: PathModel,
    indices: number[],
    dx: number,
    dy: number,
): PathModel {
  if (indices.length === 0 || (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)) return model
  const anchors = extractAnchors(model)
  const set = new Set(indices)
  const commands = clonePathCommands(model)

  for (const a of anchors) {
    if (!set.has(a.index)) continue
    const c = commands[a.commandIndex]
    if (c.type === 'M' || c.type === 'L') {
      c.point = { x: c.point.x + dx, y: c.point.y + dy }
    } else if (c.type === 'C') {
      c.end = { x: c.end.x + dx, y: c.end.y + dy }
    }
  }

  // 控制柄随所属锚点平移（不再整段 C 的 cp1/cp2 一锅端）
  for (const h of extractHandles({ commands })) {
    if (!set.has(h.anchorIndex)) continue
    const c = commands[h.commandIndex]
    if (c.type !== 'C') continue
    if (h.which === 'cp1') c.cp1 = { x: c.cp1.x + dx, y: c.cp1.y + dy }
    else c.cp2 = { x: c.cp2.x + dx, y: c.cp2.y + dy }
  }

  return { commands }
}

/**
 * 在直线段中点插入锚点。
 * `afterAnchorIndex`：段起点锚点序号；下一段命令须为 `L`。
 */
export function insertMidpointOnSegment(
    model: PathModel,
    afterAnchorIndex: number,
): PathModel | null {
  const anchors = extractAnchors(model)
  const a = anchors[afterAnchorIndex]
  const b = anchors[afterAnchorIndex + 1]
  if (!a || !b) return null
  const cmdB = model.commands[b.commandIndex]
  if (cmdB.type !== 'L') return null
  const mid: PathPoint = {
    x: (a.point.x + b.point.x) / 2,
    y: (a.point.y + b.point.y) / 2,
  }
  const commands = [...model.commands]
  commands.splice(b.commandIndex, 0, { type: 'L', point: mid })
  return { commands }
}

export interface DeleteAnchorsResult {
  ok: boolean
  model?: PathModel
  message?: string
}

/**
 * 删除锚点。开放路径剩余 ≥2，闭合 ≥3。
 * 优先支持 M/L 折线；含 C 时仅允许删除 `kind=ML` 的顶点（避免破坏曲线拓扑）。
 */
export function deleteAnchors(model: PathModel, indices: number[]): DeleteAnchorsResult {
  const anchors = extractAnchors(model)
  if (indices.length === 0) return { ok: false, message: '未选中锚点' }

  const closed = isPathClosed(model)
  const hasCubic = hasCubicSegments(model)
  const toDelete = new Set(indices)

  if (hasCubic) {
    for (const i of toDelete) {
      if (anchors[i]?.kind === 'C_END') {
        return { ok: false, message: '曲线锚点暂不支持删除，请先编辑折线路径' }
      }
    }
  }

  const remaining = anchors.length - toDelete.size
  const min = closed ? 3 : 2
  if (remaining < min) {
    return {
      ok: false,
      message: closed
          ? `闭合路径至少保留 ${min} 个锚点`
          : `开放路径至少保留 ${min} 个锚点`,
    }
  }

  // 按 commandIndex 从大到小删，避免下标错位
  const cmdIndices = [...toDelete]
      .map(i => anchors[i]?.commandIndex)
      .filter((x): x is number => x !== undefined)
      .sort((a, b) => b - a)

  const commands = [...model.commands]
  for (const ci of cmdIndices) {
    const removed = commands[ci]
    commands.splice(ci, 1)
    // 若删掉了首个 M，把下一条 L 升为 M
    if (removed?.type === 'M') {
      const next = commands.find(c => c.type === 'L' || c.type === 'C' || c.type === 'M')
      if (next && next.type === 'L') {
        const idx = commands.indexOf(next)
        commands[idx] = { type: 'M', point: { ...next.point } }
      }
    }
  }

  // 确保仍有 M
  if (!commands.some(c => c.type === 'M')) {
    const first = commands.find(c => c.type === 'L')
    if (first && first.type === 'L') {
      const idx = commands.indexOf(first)
      commands[idx] = { type: 'M', point: { ...first.point } }
    }
  }

  return { ok: true, model: { commands } }
}

/** 命中检测：点到线段距离（局部 mm） */
export function distPointToSegment(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-12) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/**
 * 找最近直线段（L）用于插入。阈值单位 mm。
 * 返回 afterAnchorIndex。
 */
export function findNearestStraightSegment(
    model: PathModel,
    localX: number,
    localY: number,
    thresholdMm: number,
): number | null {
  const anchors = extractAnchors(model)
  let best: { idx: number; d: number } | null = null
  for (let i = 0; i < anchors.length - 1; i++) {
    const b = anchors[i + 1]
    const cmdB = model.commands[b.commandIndex]
    if (cmdB.type !== 'L') continue
    const a = anchors[i]
    const d = distPointToSegment(localX, localY, a.point.x, a.point.y, b.point.x, b.point.y)
    if (d <= thresholdMm && (!best || d < best.d)) best = { idx: i, d }
  }
  // 闭合：最后一点到第一点若末命令为 Z 且存在 L 回到起点——简化为不处理 Z 弦
  return best ? best.idx : null
}

// ─── P2 贝塞尔手柄 ─────────────────────────────────────────

export type PathHandleWhich = 'cp1' | 'cp2'
export type PathHandleRole = 'out' | 'in'
/** corner=独立；smooth=共线反向保对侧长度；symmetric=共线反向等长 */
export type AnchorSmoothMode = 'corner' | 'smooth' | 'symmetric'

export interface PathHandle {
  id: string
  commandIndex: number
  which: PathHandleWhich
  role: PathHandleRole
  point: PathPoint
  /** 所属锚点序号 */
  anchorIndex: number
}

export function clonePathCommands(model: PathModel): PathCommand[] {
  return model.commands.map((c) => {
    if (c.type === 'Z') return c
    if (c.type === 'M' || c.type === 'L') return { type: c.type, point: { ...c.point } }
    return {
      type: 'C' as const,
      cp1: { ...c.cp1 },
      cp2: { ...c.cp2 },
      end: { ...c.end },
    }
  })
}

/** 提取三次贝塞尔控制柄：cp1=起点 out，cp2=终点 in */
export function extractHandles(model: PathModel): PathHandle[] {
  const anchors = extractAnchors(model)
  const cmdToAnchor = new Map<number, number>()
  for (const a of anchors) cmdToAnchor.set(a.commandIndex, a.index)

  const handles: PathHandle[] = []
  for (let ci = 0; ci < model.commands.length; ci++) {
    const c = model.commands[ci]
    if (c.type !== 'C') continue

    let startCi = ci - 1
    while (startCi >= 0 && model.commands[startCi].type === 'Z') startCi--
    const startAnchor = startCi >= 0 ? cmdToAnchor.get(startCi) : undefined
    const endAnchor = cmdToAnchor.get(ci)

    if (startAnchor !== undefined) {
      handles.push({
        id: `${ci}:cp1`,
        commandIndex: ci,
        which: 'cp1',
        role: 'out',
        point: { x: c.cp1.x, y: c.cp1.y },
        anchorIndex: startAnchor,
      })
    }
    if (endAnchor !== undefined) {
      handles.push({
        id: `${ci}:cp2`,
        commandIndex: ci,
        which: 'cp2',
        role: 'in',
        point: { x: c.cp2.x, y: c.cp2.y },
        anchorIndex: endAnchor,
      })
    }
  }
  return handles
}

function setHandlePoint(commands: PathCommand[], h: PathHandle, p: PathPoint) {
  const c = commands[h.commandIndex]
  if (c.type !== 'C') return
  if (h.which === 'cp1') c.cp1 = { x: p.x, y: p.y }
  else c.cp2 = { x: p.x, y: p.y }
}

/**
 * 移动单个控制柄。mode≠corner 时联动同锚点另一侧手柄。
 * Alt 拖曳时应传 mode='corner' 打断平滑。
 */
export function moveHandle(
    model: PathModel,
    handleId: string,
    newPoint: PathPoint,
    mode: AnchorSmoothMode = 'corner',
): PathModel {
  const handles = extractHandles(model)
  const h = handles.find((x) => x.id === handleId)
  if (!h) return model

  const commands = clonePathCommands(model)
  setHandlePoint(commands, h, newPoint)

  if (mode === 'corner') return { commands }

  const anchors = extractAnchors({ commands })
  const anchor = anchors[h.anchorIndex]
  if (!anchor) return { commands }

  const twin = handles.find((t) => t.anchorIndex === h.anchorIndex && t.id !== h.id)
  if (!twin) return { commands }

  const vx = newPoint.x - anchor.point.x
  const vy = newPoint.y - anchor.point.y
  const len = Math.hypot(vx, vy)
  if (len < 1e-9) return { commands }

  let twinLen: number
  if (mode === 'symmetric') {
    twinLen = len
  } else {
    twinLen = Math.hypot(twin.point.x - anchor.point.x, twin.point.y - anchor.point.y)
  }

  setHandlePoint(commands, twin, {
    x: anchor.point.x - (vx / len) * twinLen,
    y: anchor.point.y - (vy / len) * twinLen,
  })
  return { commands }
}

/** 根据几何推断锚点平滑模式 */
export function inferAnchorSmoothMode(model: PathModel, anchorIndex: number): AnchorSmoothMode {
  const anchors = extractAnchors(model)
  const a = anchors[anchorIndex]
  if (!a) return 'corner'
  const hs = extractHandles(model).filter((h) => h.anchorIndex === anchorIndex)
  const hIn = hs.find((h) => h.role === 'in')
  const hOut = hs.find((h) => h.role === 'out')
  if (!hIn || !hOut) return 'corner'

  const vIn = { x: hIn.point.x - a.point.x, y: hIn.point.y - a.point.y }
  const vOut = { x: hOut.point.x - a.point.x, y: hOut.point.y - a.point.y }
  const lenIn = Math.hypot(vIn.x, vIn.y)
  const lenOut = Math.hypot(vOut.x, vOut.y)
  if (lenIn < 1e-6 || lenOut < 1e-6) return 'corner'

  const dot = (vIn.x * vOut.x + vIn.y * vOut.y) / (lenIn * lenOut)
  if (dot > -0.995) return 'corner'
  if (Math.abs(lenIn - lenOut) / Math.max(lenIn, lenOut) < 0.05) return 'symmetric'
  return 'smooth'
}

/** 将锚点设为指定平滑模式 */
export function applyAnchorSmoothMode(
    model: PathModel,
    anchorIndex: number,
    mode: AnchorSmoothMode,
): PathModel {
  const hs = extractHandles(model).filter((h) => h.anchorIndex === anchorIndex)
  const hOut = hs.find((h) => h.role === 'out')
  const hIn = hs.find((h) => h.role === 'in')
  const anchors = extractAnchors(model)
  const a = anchors[anchorIndex]
  if (!a) return model

  if (mode === 'corner') {
    // 已是角点则不动；否则旋转 in 柄打断共线，便于再次推断为 corner
    if (inferAnchorSmoothMode(model, anchorIndex) === 'corner') return model
    if (!hIn) return model
    const vx = hIn.point.x - a.point.x
    const vy = hIn.point.y - a.point.y
    const ang = Math.PI / 10
    return moveHandle(model, hIn.id, {
      x: a.point.x + vx * Math.cos(ang) - vy * Math.sin(ang),
      y: a.point.y + vx * Math.sin(ang) + vy * Math.cos(ang),
    }, 'corner')
  }

  if (!hOut) return model
  return moveHandle(model, hOut.id, hOut.point, mode)
}

/** 角点 → 平滑 → 对称 → 角点 */
export function cycleAnchorSmoothMode(
    model: PathModel,
    anchorIndex: number,
): { model: PathModel; mode: AnchorSmoothMode } {
  const cur = inferAnchorSmoothMode(model, anchorIndex)
  const next: AnchorSmoothMode =
      cur === 'corner' ? 'smooth' : cur === 'smooth' ? 'symmetric' : 'corner'
  return { model: applyAnchorSmoothMode(model, anchorIndex, next), mode: next }
}

// ─── P2-2 钢笔结点 → PathModel ─────────────────────────────

/** 钢笔落点：页坐标锚点 + 可选入/出柄 */
export interface PenKnot {
  point: PathPoint
  /** 入柄（页坐标）；角点为 null */
  inHandle: PathPoint | null
  /** 出柄（页坐标）；角点为 null */
  outHandle: PathPoint | null
}

function segmentBetweenKnots(a: PenKnot, b: PenKnot): PathCommand {
  const hasCurve = a.outHandle != null || b.inHandle != null
  if (!hasCurve) {
    return { type: 'L', point: { x: b.point.x, y: b.point.y } }
  }
  return {
    type: 'C',
    cp1: a.outHandle
        ? { x: a.outHandle.x, y: a.outHandle.y }
        : { x: a.point.x, y: a.point.y },
    cp2: b.inHandle
        ? { x: b.inHandle.x, y: b.inHandle.y }
        : { x: b.point.x, y: b.point.y },
    end: { x: b.point.x, y: b.point.y },
  }
}

/**
 * 由钢笔结点序列构建 PathModel（页坐标）。
 * 无出/入柄 → L；任一侧有柄 → C。
 */
export function buildPathFromPenKnots(knots: PenKnot[], closed: boolean): PathModel {
  if (knots.length === 0) return { commands: [] }
  if (knots.length === 1) {
    return { commands: [{ type: 'M', point: { ...knots[0].point } }] }
  }
  const commands: PathCommand[] = [
    { type: 'M', point: { x: knots[0].point.x, y: knots[0].point.y } },
  ]
  for (let i = 1; i < knots.length; i++) {
    commands.push(segmentBetweenKnots(knots[i - 1], knots[i]))
  }
  if (closed && knots.length >= 3) {
    commands.push(segmentBetweenKnots(knots[knots.length - 1], knots[0]))
    commands.push({ type: 'Z' })
  }
  return { commands }
}

/** 预览用：已确认结点 + 橡皮筋到当前点（可含临时柄） */
export function buildPenPreviewModel(
    knots: PenKnot[],
    cursor: PathPoint | null,
    draft: { point: PathPoint; inHandle: PathPoint | null; outHandle: PathPoint | null } | null,
): PathModel {
  const live = [...knots]
  if (draft) {
    live.push({
      point: draft.point,
      inHandle: draft.inHandle,
      outHandle: draft.outHandle,
    })
  } else if (cursor && live.length > 0) {
    live.push({ point: cursor, inHandle: null, outHandle: null })
  }
  return buildPathFromPenKnots(live, false)
}

/** 对称镜像：out = 2*anchor - in */
export function mirrorHandle(anchor: PathPoint, handle: PathPoint): PathPoint {
  return {
    x: 2 * anchor.x - handle.x,
    y: 2 * anchor.y - handle.y,
  }
}

// ─── 折线角点倒圆角 ─────────────────────────────────────────

function almostEqualPt(a: PathPoint, b: PathPoint, eps = 1e-6): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < eps
}

/**
 * 折线角两侧是否可倒圆。
 * - 开放路径：端点不可
 * - 闭合路径：起点（M）与「仅 Z 闭合」的末点可倒
 */
export function canRoundCorner(model: PathModel, anchorIndex: number): boolean {
  const anchors = extractAnchors(model)
  const n = anchors.length
  if (n < 3 || anchorIndex < 0 || anchorIndex >= n) return false
  const closed = isPathClosed(model)
  if (!closed && (anchorIndex === 0 || anchorIndex === n - 1)) return false

  const cur = anchors[anchorIndex]
  const next = anchors[(anchorIndex + 1) % n]
  let prev = anchors[(anchorIndex - 1 + n) % n]
  // 显式闭合末点与起点重合时，几何前驱取倒数第二点
  if (closed && anchorIndex === 0 && almostEqualPt(prev.point, cur.point) && n >= 4) {
    prev = anchors[n - 2]
  }

  const cmdCur = model.commands[cur.commandIndex]
  const cmdNext = model.commands[next.commandIndex]
  const cmdPrev = model.commands[prev.commandIndex]

  if (cmdCur.type !== 'M' && cmdCur.type !== 'L') return false

  const isClosedStart = closed && anchorIndex === 0 && cmdCur.type === 'M'
  const isClosedEndViaZ =
      closed && anchorIndex === n - 1 && cmdCur.type === 'L' && cmdNext.type === 'M'

  if (isClosedStart) {
    if (cmdPrev.type !== 'L') return false
    if (cmdNext.type !== 'L') return false
  } else if (isClosedEndViaZ) {
    // 入边为直线即可
  } else {
    if (cmdCur.type === 'M') return false
    if (cmdNext.type !== 'L') return false
  }

  const p0 = prev.point
  const p1 = cur.point
  const p2 = next.point
  if (almostEqualPt(p0, p1) || almostEqualPt(p1, p2)) return false
  const len1 = Math.hypot(p0.x - p1.x, p0.y - p1.y)
  const len2 = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  if (len1 < 1e-6 || len2 < 1e-6) return false
  const u1x = (p0.x - p1.x) / len1
  const u1y = (p0.y - p1.y) / len1
  const u2x = (p2.x - p1.x) / len2
  const u2y = (p2.y - p1.y) / len2
  const cos = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y))
  const angle = Math.acos(cos)
  return angle > 0.05 && Math.PI - angle > 0.05
}

/**
 * 在指定折线锚点倒圆角：裁切两侧直线，插入三次贝塞尔近似圆弧。
 * @param radiusMm 目标半径（过大时按边长自动钳制）
 */
export function roundCornerAtAnchor(
    model: PathModel,
    anchorIndex: number,
    radiusMm: number,
): PathModel | null {
  if (!(radiusMm > 0) || !canRoundCorner(model, anchorIndex)) return null

  const anchors = extractAnchors(model)
  const n = anchors.length
  const closed = isPathClosed(model)
  const cur = anchors[anchorIndex]
  const next = anchors[(anchorIndex + 1) % n]
  let prev = anchors[(anchorIndex - 1 + n) % n]
  let closeDup = anchors[(anchorIndex - 1 + n) % n]
  if (closed && anchorIndex === 0 && almostEqualPt(prev.point, cur.point) && n >= 4) {
    prev = anchors[n - 2]
    // closeDup 仍为末点（与起点重合的显式闭合顶点）
  }

  const p0 = prev.point
  const p1 = cur.point
  const p2 = next.point
  const len1 = Math.hypot(p0.x - p1.x, p0.y - p1.y)
  const len2 = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  const u1 = { x: (p0.x - p1.x) / len1, y: (p0.y - p1.y) / len1 }
  const u2 = { x: (p2.x - p1.x) / len2, y: (p2.y - p1.y) / len2 }
  const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y))
  const angle = Math.acos(cos)

  let dist = radiusMm / Math.tan(angle / 2)
  const maxDist = Math.min(len1, len2) * 0.45
  if (dist > maxDist) dist = maxDist
  const rEff = dist * Math.tan(angle / 2)

  const t1 = { x: p1.x + u1.x * dist, y: p1.y + u1.y * dist }
  const t2 = { x: p1.x + u2.x * dist, y: p1.y + u2.y * dist }

  const sweep = Math.PI - angle
  const handle = (4 / 3) * Math.tan(sweep / 4) * rEff
  const travelIn = { x: -u1.x, y: -u1.y }
  const travelOut = { x: u2.x, y: u2.y }
  const cp1 = { x: t1.x + travelIn.x * handle, y: t1.y + travelIn.y * handle }
  const cp2 = { x: t2.x - travelOut.x * handle, y: t2.y - travelOut.y * handle }

  const commands = clonePathCommands(model)
  const zIdx = commands.findIndex(c => c.type === 'Z')

  // 闭合路径倒圆起点：M→t2；闭合边裁到 t1 后接圆弧到 t2
  if (closed && anchorIndex === 0 && commands[cur.commandIndex].type === 'M') {
    const mCi = cur.commandIndex
    commands[mCi] = { type: 'M', point: t2 }
    if (almostEqualPt(closeDup.point, p1)) {
      // M A … L A Z：改末点为 t1，其后插入 C→t2
      if (commands[closeDup.commandIndex].type !== 'L') return null
      commands[closeDup.commandIndex] = { type: 'L', point: t1 }
      commands.splice(closeDup.commandIndex + 1, 0, { type: 'C', cp1, cp2, end: t2 })
    } else {
      // M A … L C Z：在 Z 前插入 L t1 + C→t2
      if (zIdx < 0) return null
      commands.splice(zIdx, 0, { type: 'L', point: t1 }, { type: 'C', cp1, cp2, end: t2 })
    }
    return { commands }
  }

  // 仅 Z 闭合时倒圆末点：L→t1，Z 前插入 C→t2
  if (
      closed
      && anchorIndex === n - 1
      && commands[cur.commandIndex].type === 'L'
      && commands[next.commandIndex].type === 'M'
  ) {
    const bi = cur.commandIndex
    commands[bi] = { type: 'L', point: t1 }
    if (zIdx < 0) return null
    commands.splice(zIdx, 0, { type: 'C', cp1, cp2, end: t2 })
    return { commands }
  }

  const bi = cur.commandIndex
  if (commands[bi].type !== 'L') return null
  commands[bi] = { type: 'L', point: t1 }
  commands.splice(bi + 1, 0, { type: 'C', cp1, cp2, end: t2 })
  return { commands }
}

/** 按锚点序号从大到小倒圆，避免下标错乱 */
export function roundCornersAtAnchors(
    model: PathModel,
    indices: number[],
    radiusMm: number,
): PathModel {
  let m = model
  const sorted = [...new Set(indices)].sort((a, b) => b - a)
  for (const i of sorted) {
    const next = roundCornerAtAnchor(m, i, radiusMm)
    if (next) m = next
  }
  return m
}

export function findRoundableAnchorIndices(model: PathModel): number[] {
  const anchors = extractAnchors(model)
  const out: number[] = []
  for (let i = 0; i < anchors.length; i++) {
    if (canRoundCorner(model, i)) out.push(i)
  }
  return out
}

/** 对路径上所有可倒圆折线角一次性处理 */
export function roundAllPolylineCorners(model: PathModel, radiusMm: number): PathModel {
  return roundCornersAtAnchors(model, findRoundableAnchorIndices(model), radiusMm)
}

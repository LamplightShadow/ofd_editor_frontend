import type { GuideLine, GuideOrientation } from '@/types'

/** 标尺厚度（CSS px，不随页面 mm 缩放） */
export const RULER_SIZE_PX = 18

export function createGuideId(): string {
  return `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function clampGuidePosition(positionMm: number, pageSizeMm: number): number {
  if (!Number.isFinite(positionMm)) return 0
  return Math.max(0, Math.min(pageSizeMm, positionMm))
}

/** 是否拖出页面外（用于删除） */
export function isGuideOffPage(positionMm: number, pageSizeMm: number, marginMm = 4): boolean {
  return positionMm < -marginMm || positionMm > pageSizeMm + marginMm
}

export function makeGuide(orientation: GuideOrientation, positionMm: number): GuideLine {
  return {
    id: createGuideId(),
    orientation,
    positionMm,
  }
}

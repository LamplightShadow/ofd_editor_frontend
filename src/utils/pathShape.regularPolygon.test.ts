import { describe, expect, it } from 'vitest'
import { buildRegularPolygonShape, regularPolygonVertices } from './pathShape'

describe('regularPolygon', () => {
  it('六边形有 6 个顶点且闭合', () => {
    const verts = regularPolygonVertices(0, 0, 10, 6, -Math.PI / 2)
    expect(verts).toHaveLength(6)
    const shape = buildRegularPolygonShape(0, 0, 10, 6, -Math.PI / 2)
    expect(shape.pathData.endsWith('Z')).toBe(true)
    expect(shape.width).toBeGreaterThan(15)
  })

  it('边数夹在 3–24', () => {
    expect(regularPolygonVertices(0, 0, 5, 2)).toHaveLength(3)
    expect(regularPolygonVertices(0, 0, 5, 100)).toHaveLength(24)
  })
})

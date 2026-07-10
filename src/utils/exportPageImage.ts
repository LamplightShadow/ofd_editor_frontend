import JSZip from 'jszip'
import { sanitizeFilename, downloadBlob } from '@/api/ofdApi'
import { resolvePageIndices } from '@/utils/print'

/** 导出 PNG 时的分辨率倍率（相对 96dpi 画布） */
export const EXPORT_PAGE_PIXEL_RATIO = 2

export interface ExportPagesOptions {
    range: 'current' | 'all' | 'custom'
    customRange: string
    includeAnnotations: boolean
}

export const DEFAULT_EXPORT_PAGES_OPTIONS: ExportPagesOptions = {
    range: 'current',
    customRange: '',
    includeAnnotations: true,
}

export function buildPagePngFilename(docTitle: string, pageIndex: number): string {
    const base = sanitizeFilename(docTitle)
    return `${base}_第${pageIndex + 1}页.png`
}

export function buildCurrentPagePngFilename(docTitle: string, pageIndex: number): string {
    return buildPagePngFilename(docTitle, pageIndex)
}

export function resolveExportPageIndices(
    opts: Pick<ExportPagesOptions, 'range' | 'customRange'>,
    totalPages: number,
    currentIndex: number,
): number[] {
    return resolvePageIndices(
        { range: opts.range, customRange: opts.customRange, parity: 'all' },
        totalPages,
        currentIndex,
    )
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl)
    return res.blob()
}

export async function packPngZip(files: { name: string; blob: Blob }[]): Promise<Blob> {
    const zip = new JSZip()
    for (const f of files) zip.file(f.name, f.blob)
    return zip.generateAsync({ type: 'blob' })
}

export function buildExportZipFilename(docTitle: string): string {
    return `${sanitizeFilename(docTitle)}_页面导出.zip`
}

export async function downloadPngZip(docTitle: string, files: { name: string; blob: Blob }[]) {
    if (files.length === 0) return
    if (files.length === 1) {
        downloadBlob(files[0].blob, files[0].name)
        return
    }
    const zipBlob = await packPngZip(files)
    downloadBlob(zipBlob, buildExportZipFilename(docTitle))
}

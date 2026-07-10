/** 导出 PDF 时的选项 */
export interface ExportPdfOptions {
    /** 是否将批注烘焙进 PDF（关闭则导出干净版） */
    includeAnnotations: boolean
}

export const DEFAULT_EXPORT_PDF_OPTIONS: ExportPdfOptions = {
    includeAnnotations: true,
}

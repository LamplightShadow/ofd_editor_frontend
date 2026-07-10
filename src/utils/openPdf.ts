/**
 * 打开原生 PDF：走「PDF.js 前端渲染 + 注释层」路径，
 * 不再 PDF→图片→OFD 栅格化，保留矢量/文字/字体格式。
 *
 * 调用方负责未保存提示（useDocumentOpen / confirmDiscardUnsavedChanges）与 setLoading。
 */
import { useEditorStore } from '@/stores/editorStore'
import { ofdApi } from '@/api/ofdApi'
import { loadPdfDocument, releasePdfDocument } from '@/utils/pdfRender'
import { loadPdfOutline } from '@/utils/pdfOutline'

export async function openNativePdf(
    file: File,
    _handle?: FileSystemFileHandle | null,
): Promise<void> {
    const store = useEditorStore()

    if (store.isPdfDocument && store.fileId) {
        void releasePdfDocument(store.fileId)
    }

    const buf = await file.arrayBuffer()
    const doc = await ofdApi.parsePdfNative(file)
    if (!doc.fileId) throw new Error('后端未返回 fileId')

    store.setLoadingProgress(96, '正在初始化 PDF 渲染…')
    await loadPdfDocument(doc.fileId, buf)
    const outlines = await loadPdfOutline(doc.fileId)
    doc.outlines = outlines
    store.setLoadingProgress(100, '加载完成')

    store.setDocument(doc, 'pdf')
    store.setCurrentFile(file, 'pdf')
    await store.loadAllAnnotations()
}

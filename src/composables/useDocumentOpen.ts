import { ElMessage } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'
import { ofdApi } from '@/api/ofdApi'
import { addRecentFile } from '@/utils/recentFiles'
import { openNativePdf } from '@/utils/openPdf'
import { DOCUMENT_REPLACE_GUARD_HINT, withUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

/** 打开 OFD 并替换当前文档（含未保存提示） */
export async function openOfdDocument(
    file: File,
    handle?: FileSystemFileHandle | null,
): Promise<boolean> {
    const result = await withUnsavedChangesGuard(DOCUMENT_REPLACE_GUARD_HINT.openFile, async () => {
        const store = useEditorStore()
        store.setLoading(true, '正在解析OFD文件...')
        try {
            const doc = await ofdApi.parseOfd(file)
            store.setDocument(doc)
            store.setCurrentFile(file, 'ofd')
            await store.loadAllAnnotations()
            addRecentFile({ name: file.name, kind: 'ofd', handle })
            ElMessage.success(`解析成功：${doc.title}，共${doc.pageCount}页`)
            return true
        } catch (err: any) {
            ElMessage.error(err.message || '解析失败')
            return false
        } finally {
            store.setLoading(false)
        }
    })
    return result === true
}

/** 打开原生 PDF 并替换当前文档（含未保存提示） */
export async function openPdfDocument(
    file: File,
    handle?: FileSystemFileHandle | null,
): Promise<boolean> {
    const result = await withUnsavedChangesGuard(DOCUMENT_REPLACE_GUARD_HINT.openPdf, async () => {
        const store = useEditorStore()
        store.setLoading(true, '正在打开PDF...')
        try {
            await openNativePdf(file, handle)
            addRecentFile({ name: file.name, kind: 'pdf', handle })
            ElMessage.success('PDF 已打开（原生渲染，可批注）')
            return true
        } catch (err: any) {
            ElMessage.error(err.message || 'PDF打开失败')
            return false
        } finally {
            store.setLoading(false)
        }
    })
    return result === true
}

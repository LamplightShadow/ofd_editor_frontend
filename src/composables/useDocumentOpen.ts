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
            store.setShowReferenceGrid(false)
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
            store.setShowReferenceGrid(false)
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

export interface CreateBlankOfdOptions {
    /** 是否显示编辑器参考网格（不写入 OFD） */
    showGrid?: boolean
    widthMm?: number
    heightMm?: number
    title?: string
}

/** 创建空白 OFD 并打开（含未保存提示） */
export async function createBlankOfdDocument(opts: CreateBlankOfdOptions = {}): Promise<boolean> {
    const result = await withUnsavedChangesGuard('新建空白文档将关闭当前文件，未保存的修改将丢失。是否继续？', async () => {
        const store = useEditorStore()
        store.setLoading(true, '正在创建空白OFD...')
        try {
            const doc = await ofdApi.createBlankOfd({
                widthMm: opts.widthMm ?? 210,
                heightMm: opts.heightMm ?? 297,
                title: opts.title ?? '未命名文档',
            })
            store.setDocument(doc)
            store.setCurrentFile(null, 'ofd')
            store.setShowReferenceGrid(opts.showGrid !== false)
            await store.loadAllAnnotations()
            ElMessage.success(
                opts.showGrid !== false
                    ? '已创建空白文档（已开启参考网格，网格不会写入文件）'
                    : '已创建空白文档',
            )
            return true
        } catch (err: any) {
            ElMessage.error(err.message || '创建失败')
            return false
        } finally {
            store.setLoading(false)
        }
    })
    return result === true
}

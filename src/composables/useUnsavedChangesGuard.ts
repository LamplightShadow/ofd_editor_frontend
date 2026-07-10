import { ElMessageBox } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'

/**
 * 若当前文档有未保存修改，弹出确认框。
 * @returns true 表示可以继续（无修改或用户确认放弃）；false 表示用户取消
 */
export async function confirmDiscardUnsavedChanges(
    actionHint = '继续此操作',
): Promise<boolean> {
    const store = useEditorStore()
    if (!store.hasUnsavedChanges) return true

    try {
        await ElMessageBox.confirm(
            `当前文档有未保存的修改，${actionHint}将丢失这些更改。是否继续？`,
            '未保存的修改',
            {
                type: 'warning',
                confirmButtonText: '放弃修改',
                cancelButtonText: '取消',
                distinguishCancelAndClose: true,
            },
        )
        return true
    } catch {
        return false
    }
}

/**
 * 在可丢弃未保存修改的前提下执行 action。
 * 用户取消时返回 null。
 */
export async function withUnsavedChangesGuard<T>(
    actionHint: string,
    action: () => Promise<T>,
): Promise<T | null> {
    if (!await confirmDiscardUnsavedChanges(actionHint)) return null
    return action()
}

function shouldBlockUnload(): boolean {
    const store = useEditorStore()
    return !!store.hasUnsavedChanges
}

/** 注册浏览器关闭/刷新/标签页隐藏时的原生提示 */
export function registerBeforeUnloadGuard(): () => void {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!shouldBlockUnload()) return
        e.preventDefault()
        e.returnValue = ''
    }
    const onPageHide = (e: PageTransitionEvent) => {
        if (!shouldBlockUnload() || !e.persisted) return
        // bfcache 恢复场景：仍保留未保存状态，无需额外处理
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    return () => {
        window.removeEventListener('beforeunload', onBeforeUnload)
        window.removeEventListener('pagehide', onPageHide)
    }
}

/**
 * 会替换当前文档的入口应经此守卫，已覆盖：
 * - 打开 OFD / PDF（Toolbar、欢迎页、最近打开）
 * - 合并 OFD / PDF 并打开
 * - openNativePdf（PDF 导入）
 */
export const DOCUMENT_REPLACE_GUARD_HINT = {
    openFile: '打开新文件',
    openPdf: '打开新 PDF',
    mergeOpen: '合并并打开新文档',
} as const

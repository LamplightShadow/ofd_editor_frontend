export type RecentFileKind = 'ofd' | 'pdf'

export interface RecentFileEntry {
    id: string
    name: string
    kind: RecentFileKind
    /** 浏览器通常只能拿到文件名，作为路径提示展示 */
    pathHint: string
    openedAt: number
    hasHandle?: boolean
}

const STORAGE_KEY = 'ofd-editor-recent-files'
const HANDLE_DB_NAME = 'ofd-editor-recent-handles'
const HANDLE_STORE = 'handles'
export const MAX_RECENT_FILES = 10

function openHandleDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(HANDLE_DB_NAME, 1)
        req.onupgradeneeded = () => {
            req.result.createObjectStore(HANDLE_STORE)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

async function putHandle(id: string, handle: FileSystemFileHandle): Promise<void> {
    const db = await openHandleDb()
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite')
        tx.objectStore(HANDLE_STORE).put(handle, id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
    db.close()
}

async function getHandle(id: string): Promise<FileSystemFileHandle | null> {
    const db = await openHandleDb()
    const handle = await new Promise<FileSystemFileHandle | undefined>((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readonly')
        const req = tx.objectStore(HANDLE_STORE).get(id)
        req.onsuccess = () => resolve(req.result as FileSystemFileHandle | undefined)
        req.onerror = () => reject(req.error)
    })
    db.close()
    return handle ?? null
}

async function deleteHandle(id: string): Promise<void> {
    const db = await openHandleDb()
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite')
        tx.objectStore(HANDLE_STORE).delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
    db.close()
}

export function buildRecentFileId(kind: RecentFileKind, name: string): string {
    return `${kind}:${name}`
}

export function loadRecentFiles(): RecentFileEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as RecentFileEntry[]
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function saveRecentFiles(entries: RecentFileEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT_FILES)))
}

export function addRecentFile(params: {
    name: string
    kind: RecentFileKind
    handle?: FileSystemFileHandle | null
}) {
    const name = params.name.trim()
    if (!name) return

    const id = buildRecentFileId(params.kind, name)
    const entry: RecentFileEntry = {
        id,
        name,
        kind: params.kind,
        pathHint: name,
        openedAt: Date.now(),
        hasHandle: !!params.handle,
    }

    const next = loadRecentFiles().filter((item) => item.id !== id)
    next.unshift(entry)
    saveRecentFiles(next)

    if (params.handle) {
        void putHandle(id, params.handle)
    }
}

export function removeRecentFile(id: string) {
    saveRecentFiles(loadRecentFiles().filter((item) => item.id !== id))
    void deleteHandle(id)
}

export function clearRecentFiles() {
    localStorage.removeItem(STORAGE_KEY)
    void openHandleDb().then((db) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite')
        tx.objectStore(HANDLE_STORE).clear()
        db.close()
    })
}

export async function tryOpenRecentFile(
    entry: RecentFileEntry,
): Promise<{ file: File; handle: FileSystemFileHandle } | null> {
    const handle = await getHandle(entry.id)
    if (!handle) return null

    const current = await handle.queryPermission({ mode: 'read' })
    const perm = current === 'granted'
        ? current
        : await handle.requestPermission({ mode: 'read' })
    if (perm !== 'granted') return null

    const file = await handle.getFile()
    return { file, handle }
}

export function formatRecentTime(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
    return new Date(ts).toLocaleDateString()
}

export async function pickOfdWithHandle(): Promise<{ file: File; handle: FileSystemFileHandle } | null> {
    if (typeof window.showOpenFilePicker !== 'function') return null
    try {
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
                description: 'OFD 开放版式文档',
                accept: { 'application/ofd': ['.ofd'], 'application/octet-stream': ['.ofd'] },
            }],
        })
        const file = await handle.getFile()
        return { file, handle }
    } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return null
        throw e
    }
}

export async function pickPdfWithHandle(): Promise<{ file: File; handle: FileSystemFileHandle } | null> {
    if (typeof window.showOpenFilePicker !== 'function') return null
    try {
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
                description: 'PDF 文档',
                accept: { 'application/pdf': ['.pdf'] },
            }],
        })
        const file = await handle.getFile()
        return { file, handle }
    } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return null
        throw e
    }
}

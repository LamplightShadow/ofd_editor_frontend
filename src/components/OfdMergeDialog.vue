<template>
  <el-dialog
      v-model="visible"
      title="合并 OFD"
      width="520px"
      :append-to-body="true"
      class="ofd-merge-dialog"
      @closed="resetList"
  >
    <p class="merge-hint">
      选择 2～10 个 OFD 文件。列表从上到下为合并顺序：第 1 个文件的页面在最前，依次向后拼接。
    </p>

    <div class="attach-area">
      <div v-if="attachments.length === 0" class="attach-empty">
        <el-icon class="attach-empty-icon"><Document /></el-icon>
        <span>点击下方「选择 OFD」添加文件</span>
      </div>
      <ul v-else class="attach-list">
        <li
            v-for="(item, index) in attachments"
            :key="item.id"
            class="attach-item"
        >
          <div class="attach-badge">OFD</div>
          <div class="attach-body">
            <div class="attach-name" :title="item.file.name">{{ item.file.name }}</div>
            <div class="attach-meta">
              <span class="attach-order">第 {{ index + 1 }} 个{{ orderHint(index) }}</span>
              <span class="attach-size">{{ formatFileSize(item.file.size) }}</span>
            </div>
          </div>
          <el-button
              type="danger"
              link
              :icon="Close"
              title="移除"
              @click="removeAttachment(index)"
          />
        </li>
      </ul>
    </div>

    <input
        ref="fileInputRef"
        type="file"
        accept=".ofd"
        multiple
        style="display: none"
        @change="onFileSelected"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <div class="footer-actions">
          <el-button
              :icon="FolderOpened"
              :disabled="attachments.length >= MAX_FILES || merging"
              @click="triggerSelect"
          >
            选择 OFD
          </el-button>
          <el-button
              type="primary"
              :icon="Files"
              :disabled="attachments.length < MIN_FILES"
              :loading="merging"
              @click="handleMerge"
          >
            合并 OFD（{{ attachments.length }}）
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Document, Files, FolderOpened } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editorStore'
import { ofdApi } from '@/api/ofdApi'
import { confirmDiscardUnsavedChanges, DOCUMENT_REPLACE_GUARD_HINT } from '@/composables/useUnsavedChangesGuard'

const MIN_FILES = 2
const MAX_FILES = 10

interface MergeAttachment {
  id: string
  file: File
}

const visible = defineModel<boolean>({ default: false })
const store = useEditorStore()
const fileInputRef = ref<HTMLInputElement>()
const attachments = ref<MergeAttachment[]>([])
const merging = ref(false)
let attachSeq = 0

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function orderHint(index: number): string {
  if (index === 0) return '（最前）'
  if (index === attachments.value.length - 1) return '（最后）'
  return ''
}

function isOfdFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.ofd')
}

function resetList() {
  attachments.value = []
  merging.value = false
}

function triggerSelect() {
  if (attachments.value.length >= MAX_FILES) {
    ElMessage.warning(`最多选择 ${MAX_FILES} 个 OFD 文件`)
    return
  }
  fileInputRef.value?.click()
}

function isDuplicate(file: File): boolean {
  return attachments.value.some(
      (a) => a.file.name === file.name && a.file.size === file.size && a.file.lastModified === file.lastModified,
  )
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  for (const file of files) {
    if (!isOfdFile(file)) {
      ElMessage.warning(`已跳过非 OFD 文件：${file.name}`)
      continue
    }
    if (attachments.value.length >= MAX_FILES) {
      ElMessage.warning(`最多选择 ${MAX_FILES} 个 OFD 文件`)
      break
    }
    if (isDuplicate(file)) {
      ElMessage.warning(`已在列表中：${file.name}`)
      continue
    }
    attachments.value.push({
      id: `att-${++attachSeq}`,
      file,
    })
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}

async function handleMerge() {
  if (attachments.value.length < MIN_FILES) return
  if (!await confirmDiscardUnsavedChanges(DOCUMENT_REPLACE_GUARD_HINT.mergeOpen)) return

  const files = attachments.value.map((a) => a.file)
  const names = files.map((f) => f.name).join(' + ')

  merging.value = true
  store.setLoading(true, `正在合并 ${files.length} 个 OFD 文件…`)
  try {
    const doc = await ofdApi.mergeOfd(files)
    store.setDocument(doc)
    const mergedName = `${doc.title ?? 'merged'}.ofd`
    store.setCurrentFile(new File([], mergedName, { type: 'application/ofd' }), 'ofd')
    await store.loadAllAnnotations()
    ElMessage.success(`合并成功：共 ${doc.pageCount} 页（${names}）`)
    visible.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '合并失败')
  } finally {
    merging.value = false
    store.setLoading(false)
  }
}
</script>

<style scoped>
.merge-hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.attach-area {
  min-height: 160px;
  max-height: 320px;
  overflow-y: auto;
  padding: 12px;
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  background: #fafafa;
}

.attach-empty {
  height: 136px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-3);
  font-size: 13px;
}

.attach-empty-icon {
  font-size: 36px;
  color: #c0c4cc;
}

.attach-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attach-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.attach-badge {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: linear-gradient(145deg, #e8a430, #d48806);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.attach-body {
  flex: 1;
  min-width: 0;
}

.attach-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-meta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--text-3);
}

.attach-order {
  color: var(--ribbon-accent);
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-actions {
  display: flex;
  gap: 8px;
}
</style>

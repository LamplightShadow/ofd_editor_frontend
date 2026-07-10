<template>
  <el-dialog
      v-model="visible"
      title="导出页面为 PNG"
      width="440px"
      :append-to-body="true"
      @open="onOpen"
  >
    <div class="export-body">
      <section class="opt-group">
        <div class="opt-title">导出范围</div>
        <el-radio-group v-model="opts.range" class="range-group">
          <el-radio value="current">当前页（第 {{ currentPageIndex + 1 }} 页）</el-radio>
          <el-radio value="all">全部页面（共 {{ pageCount }} 页）</el-radio>
          <el-radio value="custom">自定义</el-radio>
        </el-radio-group>
        <el-input
            v-model="opts.customRange"
            :disabled="opts.range !== 'custom'"
            placeholder="例如：1-3, 5, 8"
            size="small"
            class="range-input"
        >
          <template #prepend>页码</template>
        </el-input>
        <div v-if="resolvedCount > 0" class="hint">
          将导出 {{ resolvedCount }} 页 PNG
          <template v-if="resolvedCount > 1">（打包为 ZIP）</template>
        </div>
        <div v-else class="hint hint-warn">未匹配到有效页码</div>
      </section>

      <el-divider />

      <div class="opt-row">
        <span class="opt-label">包含批注</span>
        <el-switch v-model="opts.includeAnnotations" />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
          type="primary"
          :icon="PictureFilled"
          :disabled="resolvedCount === 0"
          :loading="exporting"
          @click="confirmExport"
      >
        导出（{{ resolvedCount }} 页）
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { PictureFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'
import {
  DEFAULT_EXPORT_PAGES_OPTIONS,
  resolveExportPageIndices,
  type ExportPagesOptions,
} from '@/utils/exportPageImage'

const visible = defineModel<boolean>({ default: false })
const store = useEditorStore()
const exporting = ref(false)

const pageCount = computed(() => store.document?.pageCount ?? 0)
const currentPageIndex = computed(() => store.currentPageIndex)
const opts = reactive<ExportPagesOptions>({ ...DEFAULT_EXPORT_PAGES_OPTIONS })

const resolvedCount = computed(() =>
    resolveExportPageIndices(opts, pageCount.value, currentPageIndex.value).length,
)

function onOpen() {
  opts.range = 'current'
  opts.customRange = ''
  opts.includeAnnotations = true
}

async function confirmExport() {
  if (resolvedCount.value === 0) return
  exporting.value = true
  try {
    await store.exportPagesImage({ ...opts })
    visible.value = false
  } catch (err: any) {
    ElMessage.error(err?.message ?? '导出失败')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.export-body { padding: 2px 4px; }
.opt-group { margin-bottom: 4px; }
.opt-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-3, #8b929c);
  margin-bottom: 12px;
}
.range-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.range-input { margin-bottom: 8px; }
.opt-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.opt-label {
  width: 72px;
  font-size: 13px;
  color: var(--text-2, #4a505a);
}
.hint { font-size: 12px; color: var(--text-3, #8b929c); }
.hint-warn { color: #e6a23c; }
</style>

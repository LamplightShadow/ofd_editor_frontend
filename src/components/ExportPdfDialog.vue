<template>
  <el-dialog
      v-model="visible"
      title="导出 PDF"
      width="440px"
      :append-to-body="true"
      @open="onOpen"
  >
    <div class="export-body">
      <p class="intro">
        导出当前文档为 PDF。可选择是否将批注合并进 PDF（与 Acrobat「包含注释」类似）。
      </p>

      <div class="opt-row">
        <span class="opt-label">包含批注</span>
        <el-switch v-model="opts.includeAnnotations" />
      </div>

      <p v-if="opts.includeAnnotations && annotationCount > 0" class="hint">
        将把文档中的 {{ annotationCount }} 条批注合并进 PDF
      </p>
      <p v-else-if="opts.includeAnnotations && annotationCount === 0" class="hint hint-warn">
        当前文档无批注，将导出与干净版相同的内容
      </p>
      <p v-else class="hint">
        干净版：仅正文与页面编辑，不含批注层
      </p>

      <el-alert
          v-if="store.watermarkConfig?.text"
          type="info"
          :closable="false"
          show-icon
          class="wm-alert"
          :title="`已设置水印「${store.watermarkConfig.text}」，导出时将一并烘焙`"
      />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
          type="primary"
          :icon="Download"
          :loading="exporting"
          @click="confirmExport"
      >
        导出 PDF
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'
import { downloadBlob } from '@/api/ofdApi'
import {
  DEFAULT_EXPORT_PDF_OPTIONS,
  type ExportPdfOptions,
} from '@/utils/exportPdf'

const visible = defineModel<boolean>({ default: false })
const store = useEditorStore()
const exporting = ref(false)
const opts = reactive<ExportPdfOptions>({ ...DEFAULT_EXPORT_PDF_OPTIONS })

const annotationCount = computed(() => store.annotationCount)

function onOpen() {
  opts.includeAnnotations = DEFAULT_EXPORT_PDF_OPTIONS.includeAnnotations
}

async function confirmExport() {
  exporting.value = true
  try {
    const blob = await store.exportPdf(opts.includeAnnotations)
    const base = (store.document?.title ?? 'export').replace(/\.(ofd|pdf)$/i, '').trim() || 'export'
    downloadBlob(blob, `${base}.pdf`)
    visible.value = false
    ElMessage.success(
        opts.includeAnnotations && store.annotationCount > 0
            ? '已导出带批注的 PDF'
            : '已导出干净版 PDF',
    )
  } catch (err: any) {
    ElMessage.error(err?.message ?? '导出 PDF 失败')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.export-body { padding: 2px 4px; }
.intro {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2, #4a505a);
}
.opt-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.opt-label {
  width: 72px;
  font-size: 13px;
  color: var(--text-2, #4a505a);
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-3, #8b929c);
}
.hint-warn { color: #e6a23c; }
.wm-alert { margin-top: 12px; }
</style>

<template>
  <el-dialog
      :model-value="modelValue"
      title="新建空白 OFD"
      width="420px"
      destroy-on-close
      @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="create-blank-form">
      <div class="form-row">
        <label>页面尺寸</label>
        <el-select v-model="pageSize" style="width: 100%">
          <el-option label="A4 纵向（210 × 297 mm）" value="a4-p" />
          <el-option label="A4 横向（297 × 210 mm）" value="a4-l" />
        </el-select>
      </div>
      <div class="form-row">
        <label>文档标题</label>
        <el-input v-model="title" maxlength="80" placeholder="未命名文档" clearable />
      </div>
      <div class="form-row form-row--switch">
        <div>
          <div class="switch-title">参考线网格</div>
          <div class="switch-hint">仅编辑器显示，不会写入 OFD 文件</div>
        </div>
        <el-switch v-model="showGrid" />
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="creating" @click="onConfirm">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { createBlankOfdDocument } from '@/composables/useDocumentOpen'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const pageSize = ref<'a4-p' | 'a4-l'>('a4-p')
const title = ref('未命名文档')
const showGrid = ref(true)
const creating = ref(false)

watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        pageSize.value = 'a4-p'
        title.value = '未命名文档'
        showGrid.value = true
        creating.value = false
      }
    },
)

async function onConfirm() {
  creating.value = true
  try {
    const landscape = pageSize.value === 'a4-l'
    const ok = await createBlankOfdDocument({
      showGrid: showGrid.value,
      widthMm: landscape ? 297 : 210,
      heightMm: landscape ? 210 : 297,
      title: title.value.trim() || '未命名文档',
    })
    if (ok) emit('update:modelValue', false)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.create-blank-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.form-row--switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.switch-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.switch-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

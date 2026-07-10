<template>
  <el-dialog
      v-model="visible"
      title="键盘快捷键"
      width="520px"
      :append-to-body="true"
      class="shortcuts-dialog"
  >
    <p class="intro">按 <kbd>F1</kbd> 或 <kbd>?</kbd> 可随时打开本面板。</p>
    <el-table :data="rows" size="small" stripe max-height="420">
      <el-table-column prop="keys" label="快捷键" width="180">
        <template #default="{ row }">
          <kbd v-for="(k, i) in row.keyParts" :key="i" class="kbd">{{ k }}</kbd>
        </template>
      </el-table-column>
      <el-table-column prop="desc" label="功能" />
    </el-table>
    <template #footer>
      <el-button type="primary" @click="visible = false">知道了</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const visible = defineModel<boolean>({ default: false })

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: 'Ctrl+O', desc: '打开 OFD 文件' },
  { keys: 'Ctrl+S', desc: '保存 OFD' },
  { keys: 'Ctrl+P', desc: '打印' },
  { keys: 'Ctrl+F', desc: '全文搜索' },
  { keys: 'Ctrl+Z', desc: '撤销' },
  { keys: 'Ctrl+Y / Ctrl+Shift+Z', desc: '重做' },
  { keys: 'Ctrl++ / Ctrl+-', desc: '放大 / 缩小' },
  { keys: 'Ctrl+0', desc: '实际大小（100%）' },
  { keys: 'PageUp / PageDown', desc: '上一页 / 下一页' },
  { keys: 'Delete / Backspace', desc: '删除选中批注或元素' },
  { keys: 'Esc', desc: '取消选择 / 关闭面板' },
  { keys: 'F1 / ?', desc: '打开快捷键说明' },
]

const rows = computed(() =>
    SHORTCUTS.map((item) => ({
      ...item,
      keyParts: item.keys.split(/\s*\/\s*/).flatMap((part) => part.split(/\s+/)),
    })),
)
</script>

<style scoped>
.intro {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-2, #4a505a);
}
.kbd {
  display: inline-block;
  margin: 0 4px 4px 0;
  padding: 2px 7px;
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  background: #f4f4f5;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 1px 0 #e4e7ed;
}
</style>

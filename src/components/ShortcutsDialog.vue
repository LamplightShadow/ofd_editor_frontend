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
  { keys: 'Delete / Backspace', desc: '删除选中批注、元素或（直接选择下）锚点' },
  { keys: 'Ctrl+C', desc: '复制选中元素（支持多选/编组）' },
  { keys: 'Ctrl+V', desc: '粘贴元素到当前页（自动偏移）' },
  { keys: 'Ctrl+D', desc: '再制：复制并立即粘贴' },
  { keys: 'Ctrl+G', desc: '将多选 PATH 编组' },
  { keys: 'Ctrl+Shift+G', desc: '解组' },
  { keys: '双击组内对象', desc: '进入编组隔离编辑' },
  { keys: 'Esc', desc: '退出隔离 / 取消选择 / 退出工具' },
  { keys: 'Shift+点击', desc: '多选元素（用于编组）' },
  { keys: '双击锚点', desc: '直接选择：角点 / 平滑 / 对称循环' },
  { keys: 'Alt+拖手柄', desc: '直接选择：打断平滑，独立移动控制柄' },
  { keys: '倾斜工具', desc: '点锚点定中心，拖拽绕中心剪切；Shift=水平，Alt=垂直' },
  { keys: '内容→变换', desc: 'PATH：镜像/旋转/旋转复制（角度+缩放%+份数）/偏移/简化' },
  { keys: '内容→路径', desc: 'PATH：弧形/拱形封套、自由变形、轮廓化描边、闭合/打开、连接首尾、断开锚点' },
  { keys: '内容子页签', desc: '内容栏内：绘制（形状/整理）· 路径（变换变形）· 样式（描边填充）' },
  { keys: '折线/多边形', desc: '单击加点；双击/Enter/右键结束；Esc 取消；可连续绘制' },
  { keys: '正多边形 ↑↓ / [ ]', desc: '拖拽绘制；方向键或方括号增减边数（3–24）；Shift 吸附旋转' },
  { keys: '属性面板 PATH', desc: '改宽高为几何缩放；倾斜角应用；几何旋转按钮' },
  { keys: '标尺拖出', desc: '视图→标尺：顶边拖水平线，左侧拖垂直线；双击或拖出页面删除' },
  { keys: '钢笔 Enter / Esc', desc: '结束开放路径 / 取消绘制' },
  { keys: '钢笔 拖拽', desc: '按住拖出贝塞尔控制柄；单击为角点' },
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

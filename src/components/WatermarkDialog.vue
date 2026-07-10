<template>
  <el-dialog
      v-model="visible"
      title="文本水印"
      width="500px"
      :append-to-body="true"
      @open="onOpen"
  >
    <div class="presets">
      <span class="preset-label">快速预设</span>
      <el-button
          v-for="preset in PRESETS"
          :key="preset.label"
          size="small"
          @click="applyPreset(preset)"
      >
        {{ preset.label }}
      </el-button>
    </div>

    <div class="preview-wrap">
      <div class="preview-title">效果预览</div>
      <canvas ref="previewCanvasRef" class="preview-canvas" width="420" height="240" />
    </div>

    <el-form label-width="92px" size="default" class="wm-form">
      <el-form-item label="水印文字" required>
        <el-input v-model="form.text" placeholder="如：内部资料 请勿外传" maxlength="64" />
      </el-form-item>
      <el-form-item label="字号 (pt)">
        <el-input-number v-model="form.fontSize" :min="12" :max="120" :step="2" />
      </el-form-item>
      <el-form-item label="颜色">
        <el-color-picker v-model="form.color" />
      </el-form-item>
      <el-form-item label="透明度">
        <el-slider v-model="form.opacity" :min="0.05" :max="0.6" :step="0.01" show-input />
      </el-form-item>
      <el-form-item label="角度 (°)">
        <el-input-number v-model="form.angle" :min="-90" :max="90" :step="15" />
      </el-form-item>
      <el-form-item label="平铺">
        <el-switch v-model="form.tile" />
        <span class="hint">关闭则每页居中单个水印</span>
      </el-form-item>
      <el-form-item label="加粗">
        <el-switch v-model="form.bold" />
      </el-form-item>
    </el-form>

    <el-alert type="info" :closable="false" show-icon title="水印将在保存/导出时烘焙进文档（PDF 与 OFD 均支持）。" />

    <template #footer>
      <el-button v-if="store.watermarkConfig" @click="handleClear">清除水印</el-button>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!form.text.trim()" @click="handleApply">应用</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'
import type { WatermarkConfig } from '@/types'

const visible = defineModel<boolean>({ default: false })
const store = useEditorStore()
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)

interface WatermarkPreset extends WatermarkConfig {
  label: string
}

const PRESETS: WatermarkPreset[] = [
  {
    label: '机密',
    text: '机密',
    fontSize: 48,
    color: '#c0392b',
    opacity: 0.22,
    angle: 45,
    tile: true,
    bold: true,
  },
  {
    label: '草稿',
    text: '草稿',
    fontSize: 56,
    color: '#999999',
    opacity: 0.15,
    angle: 35,
    tile: true,
    bold: false,
  },
  {
    label: '仅供审阅',
    text: '仅供审阅',
    fontSize: 40,
    color: '#5b7a99',
    opacity: 0.2,
    angle: -30,
    tile: false,
    bold: false,
  },
]

const form = reactive({
  text: '',
  fontSize: 36,
  color: '#999999',
  opacity: 0.18,
  angle: 45,
  tile: true,
  bold: false,
})

function applyPreset(preset: WatermarkPreset) {
  form.text = preset.text
  form.fontSize = preset.fontSize ?? 36
  form.color = preset.color ?? '#999999'
  form.opacity = preset.opacity ?? 0.18
  form.angle = preset.angle ?? 45
  form.tile = preset.tile !== false
  form.bold = !!preset.bold
}

function onOpen() {
  const wm = store.watermarkConfig
  if (wm) {
    form.text = wm.text
    form.fontSize = wm.fontSize ?? 36
    form.color = wm.color ?? '#999999'
    form.opacity = wm.opacity ?? 0.18
    form.angle = wm.angle ?? 45
    form.tile = wm.tile !== false
    form.bold = !!wm.bold
  } else {
    form.text = store.document?.title ? `${store.document.title}` : '水印'
    form.fontSize = 36
    form.color = '#999999'
    form.opacity = 0.18
    form.angle = 45
    form.tile = true
    form.bold = false
  }
  nextTick(drawPreview)
}

function drawPreview() {
  const canvas = previewCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  const pad = 12
  const innerW = w - pad * 2
  const innerH = h - pad * 2

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#eef0f3'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(pad, pad, innerW, innerH)
  ctx.strokeStyle = '#dcdfe6'
  ctx.strokeRect(pad, pad, innerW, innerH)

  const text = form.text.trim() || '水印'
  const fontSize = Math.max(10, form.fontSize * 0.32)
  const angleRad = (form.angle * Math.PI) / 180

  ctx.save()
  ctx.beginPath()
  ctx.rect(pad, pad, innerW, innerH)
  ctx.clip()

  ctx.font = `${form.bold ? 'bold ' : ''}${fontSize}px "Microsoft YaHei", sans-serif`
  ctx.fillStyle = form.color
  ctx.globalAlpha = form.opacity

  if (form.tile) {
    const metrics = ctx.measureText(text)
    const gapX = metrics.width + 36
    const gapY = fontSize * 1.6
    for (let y = pad - innerH; y < h + innerH; y += gapY) {
      for (let x = pad - innerW; x < w + innerW; x += gapX) {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angleRad)
        ctx.fillText(text, 0, 0)
        ctx.restore()
      }
    }
  } else {
    ctx.translate(pad + innerW / 2, pad + innerH / 2)
    ctx.rotate(angleRad)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
  }

  ctx.restore()
}

function buildConfig(): WatermarkConfig {
  return {
    text: form.text.trim(),
    fontSize: form.fontSize,
    color: form.color,
    opacity: form.opacity,
    angle: form.angle,
    tile: form.tile,
    bold: form.bold,
  }
}

function handleApply() {
  if (!form.text.trim()) {
    ElMessage.warning('请输入水印文字')
    return
  }
  store.setWatermarkConfig(buildConfig())
  ElMessage.success('水印已设置，保存或导出时生效')
  visible.value = false
}

function handleClear() {
  store.setWatermarkConfig(null)
  ElMessage.success('已清除水印设置')
  visible.value = false
}

watch(form, () => drawPreview(), { deep: true })

onMounted(() => drawPreview())
</script>

<style scoped>
.presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.preset-label {
  font-size: 12px;
  color: var(--text-3, #8b929c);
  margin-right: 4px;
}
.preview-wrap {
  margin-bottom: 14px;
}
.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3, #8b929c);
  margin-bottom: 6px;
}
.preview-canvas {
  display: block;
  width: 100%;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px #e4e7ed;
}
.wm-form {
  margin-top: 4px;
}
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-3, #999);
}
:deep(.el-alert) {
  margin-top: 8px;
}
</style>

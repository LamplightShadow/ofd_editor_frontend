<template>
  <div class="property-panel">

    <!-- ===== 注释属性面板 ===== -->
    <template v-if="store.selectedAnnotationId && selectedAnnotation">
      <div class="panel-header">
        注释属性
        <el-tag size="small" type="info" style="margin-left:6px">
          {{ annTypeLabel[selectedAnnotation.type] ?? selectedAnnotation.type }}
        </el-tag>
      </div>

      <div class="property-form">
        <!-- 坐标 -->
        <div class="form-row">
          <div class="form-item">
            <label>X 位置</label>
            <el-input-number
                :model-value="round(selectedAnnotation?.x ?? 0)"
                size="small" :precision="1" :step="1"
                @change="(v: number) => updateAnnotation({ x: v })"
            />
          </div>
          <div class="form-item">
            <label>Y 位置</label>
            <el-input-number
                :model-value="round(selectedAnnotation?.y ?? 0)"
                size="small" :precision="1" :step="1"
                @change="(v: number) => updateAnnotation({ y: v })"
            />
          </div>
        </div>
        <div class="form-row">
          <div class="form-item">
            <label>宽度</label>
            <el-input-number
                :model-value="round(selectedAnnotation?.width ?? 1)"
                size="small" :precision="1" :step="1" :min="1"
                @change="(v: number) => updateAnnotation({ width: v })"
            />
          </div>
          <div class="form-item">
            <label>高度</label>
            <el-input-number
                :model-value="round(selectedAnnotation?.height ?? 1)"
                size="small" :precision="1" :step="1" :min="1"
                @change="(v: number) => updateAnnotation({ height: v })"
            />
          </div>
        </div>

        <el-divider style="margin: 8px 0" />

        <!-- 颜色 -->
        <div v-if="selectedAnnotation.type !== 'LINK'" class="form-item">
          <label>颜色</label>
          <el-color-picker
              v-model="editColor"
              size="small"
              @change="(v: string) => updateAnnotation({ color: v })"
          />
        </div>

        <!-- 透明度 -->
        <div class="form-item">
          <label>透明度</label>
          <el-slider
              v-model="editOpacity"
              :min="0.1" :max="1" :step="0.1"
              :format-tooltip="(v: number) => `${Math.round(v * 100)}%`"
              @change="(v: number) => updateAnnotation({ opacity: v })"
          />
        </div>

        <!-- 线宽 -->
        <div
            v-if="!['HIGHLIGHT','TEXTBOX','STICKYNOTE','STAMP','LINK'].includes(selectedAnnotation.type)"
            class="form-item"
        >
          <label>线条粗细</label>
          <el-input-number
              :model-value="selectedAnnotation?.lineWidth ?? 2"
              size="small" :min="1" :max="20" :step="1"
              @change="(v: number) => updateAnnotation({ lineWidth: v })"
          />
        </div>

        <!-- 文本内容 -->
        <template v-if="['TEXTBOX','STICKYNOTE','REPLACE'].includes(selectedAnnotation.type)">
          <el-divider style="margin: 8px 0" />
          <div class="form-item">
            <label>{{ selectedAnnotation.type === 'REPLACE' ? '替换文本' : '文本内容' }}</label>
            <el-input
                :model-value="selectedAnnotation?.content ?? ''"
                type="textarea"
                :rows="4"
                size="small"
                @change="(v: string) => updateAnnotation({ content: v })"
            />
          </div>
          <div class="form-item">
            <label>字体大小</label>
            <el-input-number
                :model-value="selectedAnnotation?.fontSize ?? 12"
                size="small" :min="6" :max="72" :step="1"
                @change="(v: number) => updateAnnotation({ fontSize: v })"
            />
          </div>
          <div class="form-item">
            <label>字体颜色</label>
            <el-color-picker
                v-model="editFontColor"
                size="small"
                @change="(v: string) => updateAnnotation({ fontColor: v })"
            />
          </div>
        </template>

        <template v-if="selectedAnnotation.type === 'LINK'">
          <el-divider style="margin: 8px 0" />
          <div class="form-item">
            <label>动作类型</label>
            <el-radio-group
                :model-value="selectedAnnotation.actionType ?? 'GOTO_PAGE'"
                size="small"
                @change="onLinkActionTypeChange"
            >
              <el-radio value="GOTO_PAGE">跳转到页</el-radio>
              <el-radio value="URI">打开网址</el-radio>
            </el-radio-group>
          </div>
          <div v-if="(selectedAnnotation.actionType ?? 'GOTO_PAGE') === 'GOTO_PAGE'" class="form-item">
            <label>目标页</label>
            <el-input-number
                :model-value="(selectedAnnotation.targetPageIndex ?? 0) + 1"
                size="small"
                :min="1"
                :max="store.document?.pageCount ?? 1"
                @change="onLinkPageChange"
            />
          </div>
          <div v-else class="form-item">
            <label>网址</label>
            <el-input
                :model-value="selectedAnnotation.uri ?? ''"
                size="small"
                placeholder="https://..."
                @change="(v: string) => updateAnnotation({ uri: v.trim() })"
            />
          </div>
          <div class="form-item">
            <label>提示文字</label>
            <el-input
                :model-value="selectedAnnotation.content ?? ''"
                size="small"
                placeholder="可选"
                @change="(v: string) => updateAnnotation({ content: v })"
            />
          </div>
          <el-button type="primary" plain size="small" style="width:100%" @click="handleExecuteLink">
            执行链接
          </el-button>
        </template>

        <el-divider style="margin: 8px 0" />

        <AnnotationDiscussion
            v-if="store.selectedAnnotationId"
            :annotation-id="store.selectedAnnotationId"
        />

        <el-divider style="margin: 8px 0" />

        <el-button
            type="danger" plain size="small"
            style="width:100%"
            :icon="Delete"
            @click="handleDeleteAnnotation"
        >
          删除该注释
        </el-button>
      </div>
    </template>

    <!-- ===== OFD 元素属性面板 ===== -->
    <template v-else>
      <div class="panel-header">元素属性</div>

      <div v-if="!store.selectedElement" class="empty-tip">
        <el-icon><Pointer /></el-icon>
        <span>请点击选择元素或注释</span>
      </div>

      <div v-else class="property-form">
        <el-tag v-if="store.selectedElement.isDirty"
                type="warning" size="small" style="margin-bottom:12px">
          已修改
        </el-tag>

        <div class="form-item">
          <label>类型</label>
          <el-tag size="small">
            {{ typeLabel[store.selectedElement.type] ?? store.selectedElement.type }}
          </el-tag>
        </div>

        <el-divider style="margin: 8px 0" />

        <div class="form-row">
          <div class="form-item">
            <label>X 位置</label>
            <el-input-number
                :model-value="round(store.selectedElement.x)"
                size="small" :precision="1" :step="1"
                @change="(v: number) => update({ x: v })"
            />
          </div>
          <div class="form-item">
            <label>Y 位置</label>
            <el-input-number
                :model-value="round(store.selectedElement.y)"
                size="small" :precision="1" :step="1"
                @change="(v: number) => update({ y: v })"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>宽度</label>
            <el-input-number
                :model-value="round(store.selectedElement.width)"
                size="small" :precision="1" :step="1" :min="1"
                @change="(v: number) => update({ width: v })"
            />
          </div>
          <div class="form-item">
            <label>高度</label>
            <el-input-number
                :model-value="round(store.selectedElement.height)"
                size="small" :precision="1" :step="1" :min="1"
                @change="(v: number) => update({ height: v })"
            />
          </div>
        </div>

        <div class="form-item">
          <label>旋转角度</label>
          <el-input-number
              :model-value="round(store.selectedElement.rotation ?? 0)"
              size="small" :precision="1" :step="5" :min="-360" :max="360"
              @change="(v: number) => update({ rotation: v })"
          />
        </div>

        <template v-if="store.selectedElement.type === 'TEXT'">
          <el-divider style="margin: 8px 0" />
          <div class="form-item">
            <label>文本内容</label>
            <!--
              用 v-model 绑本地 ref + @change 提交：
              1) v-model 双向同步，撤销/重做后 store 改变能立刻反映在 textarea；
              2) @change 失焦时一次性提交，整段编辑算作一条 history，避免每键一次撤销
            -->
            <el-input
                v-model="editContent"
                type="textarea" :rows="3" size="small"
                @change="(v: string) => update({ content: v })"
            />
          </div>
          <div class="form-item">
            <label>字体</label>
            <el-select
                v-model="editFontFamily"
                size="small"
                style="width:100%"
                @change="(v: string) => update({ fontFamily: v })"
            >
              <el-option
                  v-for="opt in TYPEWRITER_FONT_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
              />
            </el-select>
          </div>
          <div class="form-item">
            <label>字体大小</label>
            <el-input-number
                v-model="editFontSize"
                size="small" :min="2" :max="50" :step="0.5" :precision="1"
                @change="(v: number) => update({ fontSize: v })"
            />
            <span class="unit-hint">mm</span>
          </div>
          <div class="form-item">
            <label>字体颜色</label>
            <el-color-picker
                v-model="editElementColor"
                size="small"
                @change="(v: string) => update({ color: v })"
            />
          </div>
          <div class="form-item text-style-toggles">
            <label>字形</label>
            <div class="toggle-row">
              <el-button
                  size="small"
                  :type="editBold ? 'primary' : 'default'"
                  class="tw-style-btn tw-style-btn--bold"
                  @click="toggleTextBold"
              >
                B
              </el-button>
              <el-button
                  size="small"
                  :type="editItalic ? 'primary' : 'default'"
                  class="tw-style-btn tw-style-btn--italic"
                  @click="toggleTextItalic"
              >
                I
              </el-button>
            </div>
          </div>

          <template v-if="showParagraphStyle">
            <el-divider style="margin: 8px 0" />
            <div class="form-item">
              <label>段落对齐</label>
              <el-radio-group
                  v-model="editTextAlign"
                  size="small"
                  @change="(v: 'left' | 'center' | 'right') => update({ textAlign: v })"
              >
                <el-radio-button value="left">左</el-radio-button>
                <el-radio-button value="center">中</el-radio-button>
                <el-radio-button value="right">右</el-radio-button>
              </el-radio-group>
            </div>
            <div class="form-item">
              <label>字间距</label>
              <el-input-number
                  v-model="editLetterSpacingMm"
                  size="small"
                  :min="0"
                  :max="10"
                  :step="0.1"
                  :precision="1"
                  @change="(v: number) => update({ letterSpacingMm: v })"
              />
              <span class="unit-hint">mm</span>
            </div>
            <div class="form-item">
              <label>行距</label>
              <el-input-number
                  v-model="editLineSpacingMm"
                  size="small"
                  :min="0"
                  :max="50"
                  :step="0.5"
                  :precision="1"
                  @change="onLineSpacingChange"
              />
              <span class="unit-hint">mm（0 为默认）</span>
            </div>
          </template>
        </template>

        <template v-if="store.selectedElement.type === 'IMAGE'">
          <el-divider style="margin: 8px 0" />
          <el-button
              type="primary"
              plain
              size="small"
              style="width:100%"
              :icon="Crop"
              :disabled="!store.canCropSelectedImage()"
              @click="handleOpenImageCrop"
          >
            裁剪图片
          </el-button>
        </template>

        <template v-if="store.selectedElement.type === 'PATH'">
          <el-divider style="margin: 8px 0" />
          <div class="form-item">
            <label>描边颜色</label>
            <el-color-picker
                v-model="editPathStrokeColor"
                size="small"
                @change="(v: string) => updatePathStyle({ strokeColor: v, pathStrokeEnabled: true })"
            />
          </div>
          <div class="form-item">
            <label>填充颜色</label>
            <el-color-picker
                v-model="editPathFillColor"
                size="small"
                :disabled="!editPathFillEnabled"
                @change="(v: string) => updatePathStyle({ fillColor: v, pathFillEnabled: true })"
            />
          </div>
          <div class="form-item">
            <label>线宽 (mm)</label>
            <el-input-number
                v-model="editPathLineWidth"
                size="small"
                :min="0.1"
                :max="10"
                :step="0.1"
                :precision="1"
                @change="(v: number) => updatePathStyle({ lineWidth: v, pathStrokeEnabled: true })"
            />
          </div>
          <div class="form-item path-style-toggles">
            <label>样式</label>
            <div class="toggle-row">
              <el-checkbox
                  v-model="editPathStrokeEnabled"
                  @change="(v: boolean) => updatePathStyle({ pathStrokeEnabled: v })"
              >
                描边
              </el-checkbox>
              <el-checkbox
                  v-model="editPathFillEnabled"
                  @change="onPathFillToggle"
              >
                填充
              </el-checkbox>
            </div>
          </div>
          <div class="form-item">
            <label>虚线预设</label>
            <el-select
                v-model="editPathDashPreset"
                size="small"
                style="width: 100%"
                @change="onPathDashPresetChange"
            >
              <el-option
                  v-for="p in DASH_PRESETS"
                  :key="p.id"
                  :label="p.label"
                  :value="p.id"
              />
            </el-select>
          </div>
          <div class="form-item">
            <label>线端</label>
            <el-select
                v-model="editPathLineCap"
                size="small"
                style="width: 100%"
                @change="(v: string) => updatePathStyle({ lineCap: v as any })"
            >
              <el-option label="平头" value="butt" />
              <el-option label="圆头" value="round" />
              <el-option label="方头" value="square" />
            </el-select>
          </div>
          <div class="form-item">
            <label>连接</label>
            <el-select
                v-model="editPathLineJoin"
                size="small"
                style="width: 100%"
                @change="(v: string) => updatePathStyle({ lineJoin: v as any })"
            >
              <el-option label="尖角" value="miter" />
              <el-option label="圆角" value="round" />
              <el-option label="斜角" value="bevel" />
            </el-select>
          </div>
          <div class="form-item path-style-toggles">
            <label>变换</label>
            <div class="toggle-row">
              <el-checkbox
                  :model-value="store.vectorUniformScale"
                  @change="(v: boolean) => store.setVectorUniformScale(v)"
              >
                等比缩放
              </el-checkbox>
            </div>
          </div>
          <el-divider style="margin: 8px 0" />
          <div class="form-item">
            <label>倒圆角半径 (mm)</label>
            <el-input-number
                :model-value="store.pathCornerRadiusMm"
                size="small"
                :min="0.1"
                :max="50"
                :step="0.5"
                :precision="1"
                @change="(v: number | undefined) => v != null && store.setPathCornerRadiusMm(v)"
            />
          </div>
          <div class="form-item">
            <label>锚点倒圆</label>
            <div class="align-btn-row">
              <el-button
                  size="small"
                  :disabled="!canRoundSelectedAnchors"
                  @click="onRoundSelectedAnchors"
              >
                选中锚点
              </el-button>
              <el-button size="small" @click="onRoundAllCorners">
                全部折线角
              </el-button>
            </div>
          </div>
          <el-divider style="margin: 8px 0" />
          <div class="form-item">
            <label>对齐到页面</label>
            <div class="align-btn-row">
              <el-button size="small" @click="align('left')">左</el-button>
              <el-button size="small" @click="align('center')">中</el-button>
              <el-button size="small" @click="align('right')">右</el-button>
              <el-button size="small" @click="align('top')">上</el-button>
              <el-button size="small" @click="align('middle')">中</el-button>
              <el-button size="small" @click="align('bottom')">下</el-button>
            </div>
          </div>
        </template>

        <el-divider style="margin: 8px 0" />

        <el-button
            v-if="store.selectedElement.isDirty"
            type="warning" plain size="small" style="width:100%"
            :icon="RefreshLeft"
            @click="handleReset"
        >
          重置到原始状态
        </el-button>

        <el-button
            v-if="store.canDeleteSelectedElement"
            type="danger" plain size="small" style="width:100%; margin: 8px 0 0 0"
            :icon="Delete"
            @click="handleDeleteElement"
        >
          删除元素
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Pointer, RefreshLeft, Delete, Crop } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'
import type { ElementData, AnnotationData } from '@/types'
import { TYPEWRITER_FONT_OPTIONS } from '@/utils/typewriterFonts'
import { estimateTextWidthMm } from '@/utils/textBounds'
import { effectiveLineSpacingMm, normalizeTextAlign, type TextAlign } from '@/utils/textLayout'
import { DASH_PRESETS, dashPatternFromPresetId, dashPresetIdFromPattern } from '@/utils/pathStyle'
import { ANNOTATION_TYPE_LABEL as annTypeLabel } from '@/utils/annotationLabels'
import type { LinkActionType } from '@/types'
import AnnotationDiscussion from '@/components/AnnotationDiscussion.vue'

const store = useEditorStore()

const selectedAnnotation = computed(() => store.selectedAnnotation)
const selectedElement    = computed(() => store.selectedElement)

// ─── 本地缓存：注释颜色 / 透明度 / 字体颜色 ──────────────────────────────
// 用独立 ref 驱动 v-model，避免 computed plain object 不触发响应式的问题
const editColor     = ref<string>('#000000')
const editOpacity   = ref<number>(1)
const editFontColor = ref<string>('#000000')

// 每次选中注释变化时，同步本地缓存
watch(
    selectedAnnotation,
    (ann) => {
      if (ann) {
        editColor.value     = ann.color     ?? '#FFFF00'
        editOpacity.value   = ann.opacity   ?? 1
        editFontColor.value = ann.fontColor ?? '#000000'
      }
    },
    { immediate: true }
)

// ─── 本地缓存：OFD 文本元素 内容/字号/颜色 ───────────────────────────────
// 同样用独立 ref 驱动 v-model；store.selectedElement 变化（包括 undo / redo
// 替换 document 后产生的新对象）通过下方 watch 同步回这三个 ref，确保 textarea
// 和 ColorPicker 内部状态在撤销后立刻刷成历史快照里的值。
const editContent      = ref<string>('')
const editFontFamily   = ref<string>('SimSun')
const editFontSize     = ref<number>(4.233)
const editElementColor = ref<string>('#000000')
const editBold         = ref<boolean>(false)
const editItalic       = ref<boolean>(false)
const editTextAlign    = ref<TextAlign>('left')
const editLetterSpacingMm = ref<number>(0)
const editLineSpacingMm   = ref<number>(0)

const showParagraphStyle = computed(() => {
  const el = store.selectedElement
  return el?.type === 'TEXT' && !el.verticalLayout && !el.passwordGrid
})

const editPathStrokeColor   = ref<string>('#222222')
const editPathFillColor     = ref<string>('#339AF0')
const editPathLineWidth     = ref<number>(0.4)
const editPathFillEnabled   = ref<boolean>(false)
const editPathStrokeEnabled = ref<boolean>(true)
const editPathDashPreset    = ref<string>('solid')
const editPathLineCap       = ref<'butt' | 'round' | 'square'>('round')
const editPathLineJoin      = ref<'miter' | 'round' | 'bevel'>('round')

watch(
    // 监听 id + 关键字段，撤销/重做后 selectedElement 是新对象但 id 一致
    () => {
      const el = selectedElement.value
      return el
          ? {
            id: el.id,
            content: el.content,
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            color: el.color,
            bold: el.bold,
            italic: el.italic,
            textAlign: el.textAlign,
            letterSpacingMm: el.letterSpacingMm,
            lineSpacingMm: el.lineSpacingMm,
          }
          : null
    },
    (snap) => {
      if (!snap) return
      editContent.value      = snap.content ?? ''
      editFontFamily.value   = snap.fontFamily ?? 'SimSun'
      editFontSize.value     = snap.fontSize ?? 4.233
      editElementColor.value = snap.color ?? '#000000'
      editBold.value         = snap.bold === true
      editItalic.value       = snap.italic === true
      editTextAlign.value    = normalizeTextAlign(snap.textAlign)
      editLetterSpacingMm.value = snap.letterSpacingMm ?? 0
      editLineSpacingMm.value   = snap.lineSpacingMm ?? 0
    },
    { immediate: true }
)

watch(
    () => {
      const el = selectedElement.value
      return el?.type === 'PATH'
          ? {
            id: el.id,
            strokeColor: el.strokeColor,
            fillColor: el.fillColor,
            lineWidth: el.lineWidth,
            pathFillEnabled: el.pathFillEnabled,
            pathStrokeEnabled: el.pathStrokeEnabled,
            dashPattern: el.dashPattern,
            lineCap: el.lineCap,
            lineJoin: el.lineJoin,
          }
          : null
    },
    (snap) => {
      if (!snap) return
      editPathStrokeColor.value = snap.strokeColor ?? '#222222'
      editPathFillColor.value = snap.fillColor ?? '#339AF0'
      editPathLineWidth.value = snap.lineWidth ?? 0.4
      editPathFillEnabled.value = snap.pathFillEnabled !== false && !!snap.fillColor
      editPathStrokeEnabled.value = snap.pathStrokeEnabled !== false
      editPathDashPreset.value = dashPresetIdFromPattern(snap.dashPattern)
      editPathLineCap.value = snap.lineCap ?? 'round'
      editPathLineJoin.value = snap.lineJoin ?? 'round'
    },
    { immediate: true }
)

// ─── 更新注释（同步本地缓存 + 提交 store）────────────────────────────────
function updateAnnotation(changes: Partial<AnnotationData>) {
  if (!store.selectedAnnotationId) return
  if (changes.color !== undefined) editColor.value = changes.color
  if (changes.opacity !== undefined) editOpacity.value = changes.opacity
  if (changes.fontColor !== undefined) editFontColor.value = changes.fontColor
  const finalChanges = { ...changes }
  if (changes.color !== undefined) {
    finalChanges.strokeColor = changes.color
  }

  store.updateAnnotation(store.selectedAnnotationId, finalChanges)
}

function onLinkActionTypeChange(actionType: LinkActionType) {
  if (actionType === 'GOTO_PAGE') {
    updateAnnotation({
      actionType,
      uri: undefined,
      targetPageIndex: selectedAnnotation.value?.targetPageIndex ?? store.currentPageIndex,
    })
  } else {
    updateAnnotation({
      actionType,
      targetPageIndex: undefined,
    })
  }
}

function onLinkPageChange(pageNumber: number) {
  updateAnnotation({ targetPageIndex: Math.max(0, pageNumber - 1) })
}

function handleExecuteLink() {
  const ann = selectedAnnotation.value
  if (ann?.type === 'LINK') store.executeLinkAction(ann)
}

async function handleDeleteAnnotation() {
  if (!store.selectedAnnotationId) return
  await store.deleteAnnotation(store.selectedAnnotationId)
  ElMessage.success('注释已删除')
}

// ─── OFD 元素 ─────────────────────────────────────────────────────────────
const typeLabel: Record<string, string> = {
  TEXT: '文本', IMAGE: '图像', PATH: '矢量', SEAL: '电子签章', OTHER: '其他',
}

function round(val: number) {
  return Math.round(val * 10) / 10
}

function update(changes: Partial<ElementData>) {
  if (!store.selectedElementId) return
  const el = store.selectedElement
  const finalChanges = { ...changes }
  if (el?.type === 'TEXT') {
    const content = changes.content ?? el.content ?? ''
    const fs = changes.fontSize ?? el.fontSize ?? editFontSize.value
    const bold = changes.bold ?? el.bold
    const ls = changes.letterSpacingMm ?? el.letterSpacingMm ?? 0
    if (content && (changes.fontSize != null || changes.bold != null || changes.fontFamily != null || changes.content != null || changes.letterSpacingMm != null)) {
      finalChanges.width = estimateTextWidthMm(content, fs, bold, ls)
    }
    if (changes.lineSpacingMm != null && fs > 0) {
      const lineCount = Math.max(1, content.split('\n').length)
      const step = changes.lineSpacingMm > 0
          ? changes.lineSpacingMm
          : effectiveLineSpacingMm(fs)
      finalChanges.height = lineCount * step
    }
  }
  store.updateElement(store.currentPageIndex, store.selectedElementId, finalChanges)
  if (el?.type === 'TEXT') {
    const merged = { ...el, ...finalChanges }
    store.syncTypewriterStyleFromElement(merged)
  }
}

function toggleTextBold() {
  editBold.value = !editBold.value
  update({ bold: editBold.value })
}

function toggleTextItalic() {
  editItalic.value = !editItalic.value
  update({ italic: editItalic.value })
}

function onLineSpacingChange(v: number) {
  const el = store.selectedElement
  const fs = el?.fontSize ?? editFontSize.value
  const lineCount = Math.max(1, (el?.content ?? editContent.value).split('\n').length)
  const step = v > 0 ? v : effectiveLineSpacingMm(fs)
  update({
    lineSpacingMm: v > 0 ? v : undefined,
    height: lineCount * step,
  })
}

function updatePathStyle(changes: Partial<ElementData>) {
  if (!store.selectedElementId) return
  store.updateElement(store.currentPageIndex, store.selectedElementId, changes)
  const el = store.selectedElement
  if (el?.type === 'PATH') {
    store.syncVectorStyleFromElement({ ...el, ...changes })
  }
}

const canRoundSelectedAnchors = computed(() =>
    store.isDirectSelectTool && store.selectedAnchorIndices.length > 0,
)

function onRoundSelectedAnchors() {
  const res = store.roundSelectedPathAnchors()
  if (!res.ok) {
    ElMessage.warning(res.message ?? '倒圆角失败')
    return
  }
  ElMessage.success('已对选中锚点倒圆角')
}

function onRoundAllCorners() {
  const res = store.roundAllSelectedPathCorners()
  if (!res.ok) {
    ElMessage.warning(res.message ?? '倒圆角失败')
    return
  }
  ElMessage.success('已对全部折线角倒圆')
}

function onPathFillToggle(enabled: boolean) {
  updatePathStyle({
    pathFillEnabled: enabled,
    fillColor: enabled ? editPathFillColor.value : undefined,
  })
}

function onPathDashPresetChange(presetId: string) {
  const pattern = dashPatternFromPresetId(presetId)
  updatePathStyle({ dashPattern: pattern })
}

function align(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  store.alignSelectedElementToPage(mode)
}

function handleReset() {
  if (!store.selectedElementId) return
  store.resetElement(store.currentPageIndex, store.selectedElementId)
  ElMessage.success('已重置到原始状态')
}

function handleOpenImageCrop() {
  if (!store.openImageCropDialog()) {
    ElMessage.warning('当前图片无法裁剪，请确认已加载图片数据')
  }
}

async function handleDeleteElement() {
  if (!store.canDeleteSelectedElement) return
  try {
    await ElMessageBox.confirm('确定删除选中的元素吗？删除后保存即从文档中移除。', '删除元素', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  if (store.deleteSelectedElement()) {
    ElMessage.success('元素已删除，保存后生效')
  }
}
</script>
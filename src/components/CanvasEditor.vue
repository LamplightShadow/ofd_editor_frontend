<template>
  <div
      ref="wrapperRef"
      class="canvas-wrapper"
      :class="{
        'canvas-wrapper--offscreen': offscreen,
        'cursor-crosshair': !offscreen && (store.isAnnotationTool || store.isTypewriterTool || store.isVectorTool),
        'cursor-hand': !offscreen && store.isHandTool,
        'cursor-grabbing': !offscreen && store.isHandTool && isPanning,
        'cursor-direct': !offscreen && store.isDirectSelectTool,
      }"
  >
    <v-stage
        ref="stageRef"
        :config="stageConfig"
        @click="handleStageClick"
        @dblclick="handleStageDblClick"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @contextmenu="handleStageContextMenu"
    >
      <!-- ============================================================
           Layer 1：OFD 原生元素
           ============================================================ -->
      <v-layer>
        <v-rect :config="bgConfig" />

        <!-- 原生 PDF 背景：PDF.js 渲染的页面位图（矢量保真，随缩放重渲染） -->
        <v-image
            v-if="store.isPdfDocument && pdfBgCanvas"
            :config="pdfBgConfig"
        />

        <template v-for="element in visibleElements" :key="element.id">
          <v-group
              v-if="element.type === 'TEXT' && isCurrencySplitText(element)"
              :config="getCurrencyGroupConfig(element)"
              @click="handleElementClick($event, element.id)"
              @dragend="(e: any) => handleDragEnd(e, element.id)"
              @transformend="(e: any) => handleTransformEnd(e, element.id)"
          >
            <v-text :config="getCurrencyHeadConfig(element)" />
            <v-text :config="getCurrencyTailConfig(element)" />
          </v-group>
          <v-text
              v-else-if="element.type === 'TEXT'"
              :config="getTextConfig(element)"
              @click="handleElementClick($event, element.id)"
              @dragend="(e: any) => handleDragEnd(e, element.id)"
              @transformend="(e: any) => handleTransformEnd(e, element.id)"
          />
          <v-path
              v-else-if="element.type === 'PATH' && getPathData(element)"
              :config="getPathConfig(element)"
              @click="handleElementClick($event, element.id)"
              @dragend="(e: any) => handleDragEnd(e, element.id)"
              @transformend="(e: any) => handleTransformEnd(e, element.id)"
          />
          <v-image
              v-else-if="element.type === 'SEAL' && !!imageMap[element.id]"
              :config="getSealConfig(element)"
          />
          <v-rect
              v-else-if="element.type === 'SEAL' && getImageSrc(element) && !imageErrorMap[element.id]"
              :config="getSealPlaceholderConfig(element)"
          />
          <v-image
              v-else-if="element.type === 'IMAGE' && !!imageMap[element.id]"
              :key="imageNodeKey(element)"
              :config="getImageConfig(element)"
              @click="handleElementClick($event, element.id)"
              @dragend="(e: any) => handleDragEnd(e, element.id)"
              @transformend="(e: any) => handleTransformEnd(e, element.id)"
          />
          <v-rect
              v-else-if="element.type === 'IMAGE' && getImageSrc(element) && !imageErrorMap[element.id]"
              :config="getImagePlaceholderConfig(element)"
              @click="handleElementClick($event, element.id)"
          />
          <v-rect
              v-else-if="element.type === 'IMAGE' && imageErrorMap[element.id]"
              :config="getImageFailedConfig(element)"
              @click="handleElementClick($event, element.id)"
          />
          <v-rect
              v-else-if="element.type === 'IMAGE'"
              :config="getImageNoSrcPlaceholderConfig(element)"
              @click="handleElementClick($event, element.id)"
          />
          <v-rect
              v-else
              :config="getFallbackConfig(element)"
              @click="handleElementClick($event, element.id)"
          />
        </template>

        <v-transformer
            v-if="!offscreen && store.isSelectTool"
            ref="transformerRef"
            :config="transformerConfig"
        />
      </v-layer>

      <!-- ============================================================
           Layer 2：已保存的注释层
           ============================================================ -->
      <v-layer ref="annotationLayerRef">
        <template v-for="item in annotationConfigs" :key="item.ann.id">

          <v-rect
              v-if="item.ann.type === 'HIGHLIGHT'"
              :config="item.highlightCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-line
              v-else-if="item.ann.type === 'UNDERLINE'"
              :config="item.underlineCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-line
              v-else-if="item.ann.type === 'STRIKEOUT'"
              :config="item.strikeoutCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-line
              v-else-if="item.ann.type === 'SQUIGGLY'"
              :config="item.squigglyCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-group
              v-else-if="item.ann.type === 'REPLACE'"
              :config="item.replaceGroupCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dblclick="handleAnnotationDblClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          >
            <v-text :config="item.replaceTextCfg" />
            <v-line :config="item.replaceStrikeCfg" />
            <v-line :config="item.replaceCaretCfg" />
          </v-group>
          <v-rect
              v-else-if="item.ann.type === 'RECTANGLE'"
              :config="item.rectangleCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-ellipse
              v-else-if="item.ann.type === 'CIRCLE'"
              :config="item.circleCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-arrow
              v-else-if="item.ann.type === 'ARROW'"
              :config="item.arrowCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-line
              v-else-if="item.ann.type === 'FREEHAND'"
              :config="item.freehandCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-group
              v-else-if="item.ann.type === 'TEXTBOX'"
              :config="item.groupCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dblclick="handleAnnotationDblClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          >
            <v-rect :config="item.textBoxBgCfg" />
            <v-text :config="item.textBoxTxtCfg" />
          </v-group>
          <v-group
              v-else-if="item.ann.type === 'STICKYNOTE'"
              :config="item.groupCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dblclick="handleAnnotationDblClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          >
            <v-rect :config="item.stickyBgCfg" />
            <v-text :config="item.stickyTxtCfg" />
          </v-group>
          <v-image
              v-else-if="item.ann.type === 'STAMP'"
              :config="item.stampCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />
          <v-rect
              v-else-if="item.ann.type === 'LINK'"
              :config="item.linkCfg"
              @click="handleAnnotationClick($event, item.ann.id)"
              @dblclick="handleAnnotationDblClick($event, item.ann.id)"
              @dragend="(e: any) => handleAnnotationDragEnd(e, item.ann)"
              @transformend="(e: any) => handleAnnotationTransformEnd(e, item.ann)"
          />

        </template>

        <v-transformer
            ref="annotationTransformerRef"
            :config="annotationTransformerConfig"
        />
      </v-layer>

      <!-- Layer 3：临时绘制层（始终挂载，用 visible 隐藏，避免 v-if 与 Konva 冲突） -->
      <v-layer :config="previewLayerConfig">
        <v-rect
            v-if="['RECTANGLE', 'HIGHLIGHT', 'LINK', 'VECTOR_RECT'].includes(drawTool)"
            :config="previewRectConfig"
        />
        <v-ellipse
            v-else-if="drawTool === 'CIRCLE' || drawTool === 'VECTOR_ELLIPSE'"
            :config="previewEllipseConfig"
        />
        <v-line
            v-else-if="drawTool === 'VECTOR_LINE'"
            :config="previewVectorLineConfig"
        />
        <v-line
            v-else-if="['VECTOR_POLYLINE', 'VECTOR_POLYGON'].includes(drawTool)"
            :config="previewPolylineConfig"
        />
        <template v-else-if="drawTool === 'VECTOR_PEN' || penActive">
          <v-path :config="previewPenPathConfig" />
          <v-line
              v-for="(spk, i) in previewPenSpokeConfigs"
              :key="'pen-spk-' + i"
              :config="spk"
          />
          <v-circle
              v-for="(dot, i) in previewPenDotConfigs"
              :key="'pen-dot-' + i"
              :config="dot"
          />
        </template>
        <v-line
            v-else-if="drawTool === 'FREEHAND'"
            :config="previewFreehandConfig"
        />
        <v-arrow
            v-else-if="drawTool === 'ARROW'"
            :config="previewArrowConfig"
        />
        <v-line
            v-else-if="drawTool === 'UNDERLINE'"
            :config="previewUnderlineConfig"
        />
        <v-line
            v-else-if="drawTool === 'STRIKEOUT'"
            :config="previewStrikeoutConfig"
        />
        <v-line
            v-else-if="drawTool === 'SQUIGGLY'"
            :config="previewSquigglyConfig"
        />
        <v-group v-else-if="drawTool === 'REPLACE'" :config="previewReplaceGroupConfig">
          <v-line :config="previewReplaceStrikeConfig" />
          <v-line :config="previewReplaceCaretConfig" />
        </v-group>
      </v-layer>

      <!-- ============================================================
           Layer：全文搜索高亮（命中矩形，随舞台旋转，不拦截事件）
           ============================================================ -->
      <v-layer v-if="searchHighlightConfigs.length > 0" :listening="false">
        <template v-for="hl in searchHighlightConfigs" :key="'sh-' + hl.index">
          <v-rect
              v-for="(rc, ri) in hl.rects"
              :key="'sh-' + hl.index + '-' + ri"
              :config="rc"
          />
        </template>
      </v-layer>

      <!-- PATH 锚点 / 贝塞尔手柄编辑层：置于最顶，与 Transformer 互斥 -->
      <v-layer v-if="!offscreen && pathEditVisible">
        <v-line
            v-for="(seg, si) in pathEditSegmentHits"
            :key="'seg-' + si"
            :config="seg"
            @dblclick="(e: any) => handlePathSegmentDblClick(e, si)"
        />
        <v-line
            v-for="line in pathHandleSpokeConfigs"
            :key="'spoke-' + line.id"
            :config="line.config"
        />
        <v-rect
            v-if="anchorMarquee"
            :config="anchorMarqueeConfig"
        />
        <v-circle
            v-for="h in pathHandleConfigs"
            :key="'hdl-' + h.id"
            :config="h.config"
            @mousedown="(e: any) => handleBezierHandleMouseDown(e, h.id)"
            @dragmove="(e: any) => handleBezierHandleDragMove(e, h.id)"
            @dragend="(e: any) => handleBezierHandleDragEnd(e, h.id)"
        />
        <v-circle
            v-for="a in pathEditAnchorConfigs"
            :key="'anc-' + a.id"
            :config="a.config"
            @mousedown="(e: any) => handleAnchorMouseDown(e, a.index)"
            @dragmove="(e: any) => handleAnchorDragMove(e, a.index)"
            @dragend="(e: any) => handleAnchorDragEnd(e, a.index)"
            @click="(e: any) => handleAnchorClick(e, a.index)"
            @dblclick="(e: any) => handleAnchorDblClick(e, a.index)"
        />
      </v-layer>
    </v-stage>

    <!-- ============================================================
         文本选择层：透明可选中文本（仅视图未旋转、文本选择模式开启时）
         ============================================================ -->
    <div
        v-if="showTextLayer"
        class="text-select-layer"
        :style="textLayerStyle"
    >
      <span
          v-for="(it, i) in textLayerItems"
          :key="'tx-' + i"
          class="text-select-span"
          :style="textSpanStyle(it)"
      >{{ it.str }}</span>
    </div>

    <!-- 文本注释编辑弹窗 -->
    <el-dialog
        v-model="textEditVisible"
        :title="textEditDialogTitle"
        width="400px"
        :append-to-body="true"
        @closed="onTextEditDialogClosed"
    >
      <el-input
          v-model="textEditContent"
          type="textarea"
          :rows="5"
          :placeholder="textEditPlaceholder"
      />
      <template #footer>
        <el-button @click="cancelTextEdit">取消</el-button>
        <el-button type="primary" @click="confirmTextEdit">确定</el-button>
      </template>
    </el-dialog>

    <LinkActionDialog
        v-model="linkDialogVisible"
        :page-count="store.document?.pageCount ?? 1"
        :initial="linkDialogInitial"
        :edit-id="linkEditTargetId"
        @confirm="confirmLinkAction"
        @cancel="onLinkDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, withDefaults } from 'vue'
import { ElMessage } from 'element-plus'
import { useEditorStore } from '@/stores/editorStore'
import type { PageData, ElementData, AnnotationData } from '@/types'
import { effectivePageSizeMm, konvaStageRotationConfig, normalizeViewRotation } from '@/utils/viewRotation'
import { renderPdfPage, type PageTextItem } from '@/utils/pdfRender'
import { buildSquigglyRelativePoints, relativePointsToKonva } from '@/utils/markupPath'
import { scaleLocalPath, translateSvgPath } from '@/utils/pathShape'
import {
  extractAnchors,
  extractHandles,
  inferAnchorSmoothMode,
  moveHandle,
  parsePathModel,
  serializePathModel,
  buildPenPreviewModel,
  mirrorHandle,
  type PenKnot,
} from '@/utils/pathModel'
import { dashPatternToKonva, normalizeLineCap, normalizeLineJoin } from '@/utils/pathStyle'
import { lineHeightRatio, normalizeTextAlign } from '@/utils/textLayout'
import LinkActionDialog from '@/components/LinkActionDialog.vue'
import type { LinkActionType } from '@/types'

// ─────────────────────────────────────────────
// Props / Store
// ─────────────────────────────────────────────
const props = withDefaults(
    defineProps<{
      page: PageData
      pageIndex: number
      /** 离屏渲染：仅用于缩略图截图，不响应交互 */
      offscreen?: boolean
      /** 固定缩放（离屏截图时用 1，避免影响主画布 store.scale） */
      fixedScale?: number
    }>(),
    { offscreen: false },
)
const store = useEditorStore()

const renderScale = computed(() => props.fixedScale ?? store.scale)

// 渲染时过滤掉被标记删除的元素（保存时再由后端移除原 OFD 节点）
const visibleElements = computed(() => props.page.elements.filter((el) => !el.isDeleted))

// ─────────────────────────────────────────────
// 全文搜索高亮（命中矩形，stage 坐标，随旋转）
// ─────────────────────────────────────────────
const searchHighlightConfigs = computed(() => {
  if (props.offscreen) return []
  const list = store.searchMatchesByPage[props.pageIndex] ?? []
  return list.map(({ match, index }) => ({
    index,
    rects: match.rects.map((r) => ({
      x: r.x * MM_TO_PX * renderScale.value,
      y: r.y * MM_TO_PX * renderScale.value,
      width: Math.max(2, r.w * MM_TO_PX * renderScale.value),
      height: Math.max(2, r.h * MM_TO_PX * renderScale.value),
      fill: index === store.searchActiveIndex ? 'rgba(255,140,0,0.55)' : 'rgba(255,221,0,0.42)',
      cornerRadius: 1,
      listening: false,
    })),
  }))
})

// ─────────────────────────────────────────────
// 文本选择层（透明可选文本，仅未旋转时）
// ─────────────────────────────────────────────
const textLayerItems = ref<PageTextItem[]>([])

const showTextLayer = computed(() =>
    !props.offscreen
    && store.textSelectMode
    && normalizeViewRotation((props.page.pageRotate ?? 0) + store.viewRotation) === 0
    && textLayerItems.value.length > 0,
)

const textLayerStyle = computed(() => ({
  width: `${props.page.width * MM_TO_PX * renderScale.value}px`,
  height: `${props.page.height * MM_TO_PX * renderScale.value}px`,
}))

function textSpanStyle(it: PageTextItem) {
  const sc = MM_TO_PX * renderScale.value
  const h = Math.max(1, it.hMm * sc)
  return {
    left: `${it.xMm * sc}px`,
    top: `${it.yMm * sc}px`,
    fontSize: `${h}px`,
    lineHeight: `${h}px`,
    height: `${h}px`,
  }
}

async function loadTextLayer() {
  if (props.offscreen || !store.textSelectMode) {
    textLayerItems.value = []
    return
  }
  try {
    textLayerItems.value = await store.getPageTextItems(props.pageIndex)
  } catch {
    textLayerItems.value = []
  }
}

watch(
    () => [store.textSelectMode, store.fileId, props.pageIndex, props.page.id] as const,
    () => { void loadTextLayer() },
    { immediate: true },
)

// ─────────────────────────────────────────────
// Konva 引用
// ─────────────────────────────────────────────
const stageRef                 = ref()
const wrapperRef               = ref<HTMLElement>()
const transformerRef           = ref()
const annotationLayerRef       = ref()
const annotationTransformerRef = ref()

/**
 * 撤销 / 重做兜底刷新：
 * store.renderVersion 在 undo / redo 后 +1。
 *
 * 之前发现 vue-konva 的 `watch(() => props.config, …, { deep:true })`
 * 在 applyInPlace 之后并不会重新触发（props.config 由父组件每次 render 时新建，
 * 但父组件的 render effect 在某些 element 属性变化下不一定调度执行，
 * 导致 Konva 节点的 text / fontSize / fill 停留在撤销前的值）。
 *
 * 这里走两条路兜底：
 *   1) 等下一个 tick（Vue 把可能的 patch 都跑完），从 stage 上把所有 Konva.Text 节点找出来；
 *      根据当前 store 里的 element 数据手动写一遍 text / fontSize / fill 等关键字段，
 *      并清掉 Konva 内部的 measure cache。
 *   2) 最后再来一次 stage.draw() 强制重绘。
 */
watch(
    () => store.renderVersion,
    () => {
      nextTick(() => {
        const stage = stageRef.value?.getNode?.()
        if (!stage) return

        const page = props.page
        if (page) {
          // Konva 节点用 element.id 作为内部 id 属性；按 id 找回节点，
          // 直接把最新 store 数据写到节点上，绕开 vue-konva deep watcher 漏发的情况
          for (const el of page.elements) {
            const node: any = stage.findOne('#' + el.id)
            if (!node) continue
            if (el.type === 'TEXT') {
              if (isCurrencySplitText(el)) {
                const grp = stage.findOne('#' + el.id)
                grp?.setAttrs(getCurrencyGroupConfig(el))
                stage.findOne('#' + el.id + '-cur-h')?.setAttrs(getCurrencyHeadConfig(el))
                stage.findOne('#' + el.id + '-cur-t')?.setAttrs(getCurrencyTailConfig(el))
              } else {
                node.setAttrs(getTextConfig(el))
              }
            } else if (el.type === 'PATH') {
              node.setAttrs(getPathConfig(el))
            } else if (el.type === 'IMAGE' && imageMap[el.id]) {
              node.setAttrs(getImageConfig(el))
            }
            node.clearCache?.()
          }
        }
        stage.draw()
      })
    },
)

// ─────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────
const MM_TO_PX = 3.7795275591

/**
 * 支持通过锚点缩放的注释类型。
 * HIGHLIGHT / UNDERLINE / STRIKEOUT / ARROW / FREEHAND
 * 不在此列，选中后只显示边框，不显示缩放锚点。
 */
const RESIZABLE_TYPES = ['RECTANGLE', 'CIRCLE', 'TEXTBOX', 'STICKYNOTE', 'STAMP', 'LINK']

// ─────────────────────────────────────────────
// Stage 基础配置
// ─────────────────────────────────────────────
const canvasWidth  = computed(() => props.page.width  * MM_TO_PX * renderScale.value)
const canvasHeight = computed(() => props.page.height * MM_TO_PX * renderScale.value)

const stageRotation = computed(() =>
    konvaStageRotationConfig(
        props.page.width,
        props.page.height,
        renderScale.value,
        props.offscreen
            ? normalizeViewRotation(props.page.pageRotate ?? 0)
            : normalizeViewRotation((props.page.pageRotate ?? 0) + store.viewRotation),
    ),
)

const stageConfig = computed(() => {
  const rot = stageRotation.value
  return {
    width:     rot.stageWidth,
    height:    rot.stageHeight,
    rotation:  rot.rotation,
    offsetX:   rot.offsetX,
    offsetY:   rot.offsetY,
    x:         rot.x,
    y:         rot.y,
    listening: !props.offscreen,
  }
})

watch(
    () => store.viewRotation,
    () => {
      nextTick(() => stageRef.value?.getNode?.()?.batchDraw?.())
    },
)

const bgConfig = computed(() => ({
  x: 0, y: 0,
  width:  canvasWidth.value,
  height: canvasHeight.value,
  fill:   'white',
  name:   'page-bg',
}))

// ─────────────────────────────────────────────
// 原生 PDF 背景（PDF.js）
// ─────────────────────────────────────────────
const pdfBgCanvas = ref<HTMLCanvasElement | null>(null)
let pdfRenderTimer: ReturnType<typeof setTimeout> | null = null
let pdfRenderSeq = 0

const pdfBgConfig = computed(() => ({
  x: 0, y: 0,
  width:  canvasWidth.value,
  height: canvasHeight.value,
  image:  pdfBgCanvas.value as any,
  listening: false,
}))

/** PDF 原始页号：随页面重排/复制而携带；插入的空白页为 null（渲染白页） */
const pdfSourceIndex = computed(() => {
  const s = props.page.sourcePageIndex
  return s == null ? -1 : s
})

async function renderPdfBackground() {
  if (!store.isPdfDocument || !store.fileId) return
  const seq = ++pdfRenderSeq
  // 空白页（插入页）没有原始页，渲染白底
  if (pdfSourceIndex.value < 0) {
    pdfBgCanvas.value = null
    await nextTick()
    stageRef.value?.getNode?.()?.batchDraw?.()
    return
  }
  // 离屏缩略图用低过采样提速；主视图按 dpr（封顶 2）保证清晰
  const oversample = props.offscreen
      ? 1
      : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
  try {
    const canvas = await renderPdfPage(store.fileId, pdfSourceIndex.value, renderScale.value, oversample)
    if (seq !== pdfRenderSeq) return // 已有更新的渲染请求
    if (canvas) {
      pdfBgCanvas.value = canvas
      await nextTick()
      stageRef.value?.getNode?.()?.batchDraw?.()
    }
  } catch (e) {
    console.warn('[CanvasEditor] PDF 背景渲染失败 source=' + pdfSourceIndex.value, e)
  }
}

function schedulePdfRender(delay = 160) {
  if (pdfRenderTimer) clearTimeout(pdfRenderTimer)
  pdfRenderTimer = setTimeout(() => {
    pdfRenderTimer = null
    void renderPdfBackground()
  }, delay)
}

// 文档/页面（含重排后原始页变化）/缩放变化时刷新 PDF 背景
watch(
    () => [store.isPdfDocument, store.fileId, props.pageIndex, props.page.id, props.page.sourcePageIndex] as const,
    () => {
      pdfBgCanvas.value = null
      if (store.isPdfDocument) void renderPdfBackground()
    },
    { immediate: true },
)

watch(renderScale, () => {
  if (store.isPdfDocument) schedulePdfRender()
})

onMounted(() => {
  if (store.isPdfDocument) void renderPdfBackground()
  window.addEventListener('keydown', onPolylineKeydown)
})

function onPolylineMouseMove(e: MouseEvent) {
  if (!polylineActive.value) return
  const pos = getStagePosFromClient(e)
  if (pos) polylineCursor.value = { x: pos.x, y: pos.y }
}

function startPolylineSession() {
  window.addEventListener('mousemove', onPolylineMouseMove)
}

function stopPolylineSession() {
  window.removeEventListener('mousemove', onPolylineMouseMove)
}

function cancelPolylineDraw() {
  polylineActive.value = false
  polylinePoints.value = []
  polylineCursor.value = null
  stopPolylineSession()
}

async function finishPolylineDraw(forceClosed?: boolean) {
  if (!polylineActive.value) return
  const closed = forceClosed ?? (store.currentTool === 'VECTOR_POLYGON')
  if (polylinePoints.value.length < 2) {
    cancelPolylineDraw()
    return
  }
  if (closed && polylinePoints.value.length < 3) {
    ElMessage.warning('多边形至少需要 3 个点')
    return
  }
  const pts = [...polylinePoints.value]
  cancelPolylineDraw()
  await waitForKonvaSettle()
  store.addVectorPolyline(props.pageIndex, pts, closed)
  store.setTool('SELECT')
}

function onPolylineKeydown(e: KeyboardEvent) {
  if (props.offscreen || props.pageIndex !== store.currentPageIndex) return
  if (penActive.value) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void finishPenDraw(false)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelPenDraw()
      store.setTool('SELECT')
    }
    return
  }
  if (!polylineActive.value) return
  if (e.key === 'Enter') {
    e.preventDefault()
    void finishPolylineDraw(false)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelPolylineDraw()
    store.setTool('SELECT')
  }
}

watch(
    () => store.currentTool,
    (tool) => {
      if (tool !== 'VECTOR_POLYLINE' && tool !== 'VECTOR_POLYGON') {
        cancelPolylineDraw()
      }
      if (tool !== 'VECTOR_PEN') {
        cancelPenDraw()
      }
    },
)

// ─────────────────────────────────────────────
// P2-2 钢笔（贝塞尔）：点击落点，拖拽出控制柄
// ─────────────────────────────────────────────
const PEN_DRAG_THRESHOLD_MM = 0.8
const PEN_CLOSE_THRESHOLD_MM = 2.5

const penActive = ref(false)
const penKnots = ref<PenKnot[]>([])
const penCursor = ref<{ x: number; y: number } | null>(null)
const penPlacing = ref(false)
const penDraftPoint = ref<{ x: number; y: number } | null>(null)
const penDraftOut = ref<{ x: number; y: number } | null>(null)
const penClosing = ref(false)

function cancelPenDraw() {
  penActive.value = false
  penKnots.value = []
  penCursor.value = null
  penPlacing.value = false
  penDraftPoint.value = null
  penDraftOut.value = null
  penClosing.value = false
  window.removeEventListener('mousemove', onPenPlaceMove)
  window.removeEventListener('mouseup', onPenPlaceUp)
  window.removeEventListener('mousemove', onPenCursorMove)
}

function startPenCursorTrack() {
  window.addEventListener('mousemove', onPenCursorMove)
}

function onPenCursorMove(e: MouseEvent) {
  if (!penActive.value || penPlacing.value) return
  const pos = getStagePosFromClient(e)
  if (pos) penCursor.value = { x: pos.x, y: pos.y }
}

async function finishPenDraw(closed: boolean) {
  if (!penActive.value) return
  if (penKnots.value.length < 2) {
    cancelPenDraw()
    return
  }
  if (closed && penKnots.value.length < 3) {
    ElMessage.warning('闭合路径至少需要 3 个点')
    return
  }
  const knots = penKnots.value.map((k) => ({
    point: { ...k.point },
    inHandle: k.inHandle ? { ...k.inHandle } : null,
    outHandle: k.outHandle ? { ...k.outHandle } : null,
  }))
  cancelPenDraw()
  await waitForKonvaSettle()
  store.addVectorFromPenKnots(props.pageIndex, knots, closed)
  store.setTool('DIRECT_SELECT')
}

function beginPenPlace(pos: { x: number; y: number }, closing: boolean) {
  penPlacing.value = true
  penClosing.value = closing
  penDraftPoint.value = { x: pos.x, y: pos.y }
  penDraftOut.value = null
  penCursor.value = { x: pos.x, y: pos.y }
  window.addEventListener('mousemove', onPenPlaceMove)
  window.addEventListener('mouseup', onPenPlaceUp)
}

function onPenPlaceMove(e: MouseEvent) {
  if (!penPlacing.value || !penDraftPoint.value) return
  const pos = getStagePosFromClient(e) ?? getStagePos()
  if (!pos) return
  penCursor.value = { x: pos.x, y: pos.y }
  const o = penDraftPoint.value
  if (Math.hypot(pos.x - o.x, pos.y - o.y) >= PEN_DRAG_THRESHOLD_MM) {
    penDraftOut.value = { x: pos.x, y: pos.y }
  } else {
    penDraftOut.value = null
  }
}

function onPenPlaceUp() {
  window.removeEventListener('mousemove', onPenPlaceMove)
  window.removeEventListener('mouseup', onPenPlaceUp)
  if (!penPlacing.value || !penDraftPoint.value) {
    penPlacing.value = false
    return
  }
  const point = { ...penDraftPoint.value }
  const out = penDraftOut.value ? { ...penDraftOut.value } : null
  const inn = out ? mirrorHandle(point, out) : null
  penPlacing.value = false
  penDraftPoint.value = null
  penDraftOut.value = null

  if (penClosing.value) {
    // 闭合：把拖出的柄写到首点入柄
    if (penKnots.value.length >= 3) {
      const first = penKnots.value[0]
      if (inn) {
        penKnots.value[0] = {
          ...first,
          inHandle: inn,
          // 若首点尚无出柄且拖了，也可用 out 作为首点出柄（闭合 C 的 cp1 来自末点）
        }
      }
      void finishPenDraw(true)
    }
    penClosing.value = false
    return
  }

  penKnots.value.push({
    point,
    inHandle: inn,
    outHandle: out,
  })
  if (!penActive.value) {
    penActive.value = true
    drawTool.value = 'VECTOR_PEN'
    startPenCursorTrack()
  }
}

const transformerConfig = {
  rotateEnabled: true,
  boundBoxFunc: (oldBox: any, newBox: any) =>
      (newBox.width < 10 || newBox.height < 10) ? oldBox : newBox,
}

// ─────────────────────────────────────────────
// 注释 Transformer 配置
// ─────────────────────────────────────────────
const annotationTransformerConfig = computed(() => ({
  rotateEnabled:      false,
  keepRatio:          false,
  visible:            !!(store.currentTool === 'SELECT' && store.selectedAnnotationId),
  borderStroke:       '#1a73e8',
  borderStrokeWidth:  2,
  anchorFill:         '#ffffff',
  anchorStroke:       '#1a73e8',
  anchorSize:         8,
  anchorCornerRadius: 2,
  enabledAnchors: [
    'top-left',    'top-center',    'top-right',
    'middle-left',                  'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ],
  boundBoxFunc: (oldBox: any, newBox: any) =>
      (newBox.width < 10 || newBox.height < 10) ? oldBox : newBox,
}))

// ─────────────────────────────────────────────
// 单位换算
// ─────────────────────────────────────────────
function s(v: number)     { return v * MM_TO_PX * renderScale.value }
function px2mm(v: number) { return v / MM_TO_PX / renderScale.value }

// ─────────────────────────────────────────────
// OFD 元素图片缓存
// ─────────────────────────────────────────────
const imageMap      = reactive<Record<string, HTMLImageElement>>({})
const imageErrorMap = reactive<Record<string, boolean>>({})

watch(
    () => props.page.elements
        .filter(el => el.type === 'IMAGE' || el.type === 'SEAL')
        .map(el => ({
          id: el.id,
          src: getImageSrc(el),
          rev: el.imageRevision ?? 0,
        })),
    (items) => {
      const alive = new Set(items.map(i => i.id))
      for (const id of Object.keys(imageMap)) {
        if (!alive.has(id)) {
          delete imageMap[id]
          delete imageErrorMap[id]
        }
      }
      for (const item of items) {
        if (!item.src) continue
        const cached = imageMap[item.id]
        if (cached && cached.src === item.src) continue
        delete imageMap[item.id]
        imageErrorMap[item.id] = false
        const img = new window.Image()
        if (!item.src.startsWith('data:')) img.crossOrigin = 'anonymous'
        img.onload  = () => {
          imageMap[item.id] = img
          store.renderVersion++
        }
        img.onerror = () => {
          imageErrorMap[item.id] = true
          console.warn('[IMG 加载失败]', item.id, item.src.slice(0, 80))
        }
        img.src = item.src
      }
    },
    { immediate: true, deep: false }
)

function imageNodeKey(element: ElementData): string {
  const src = getImageSrc(element)
  const rev = element.imageRevision ?? 0
  return `${element.id}-${rev}-${src.length}`
}

// ─────────────────────────────────────────────
// 注释数据
// ─────────────────────────────────────────────
const pageAnnotations = computed<AnnotationData[]>(() =>
    store.annotationsMap[props.pageIndex] ?? [],
)

const visiblePageAnnotations = computed(() =>
    pageAnnotations.value.filter((a) => !a.hidden),
)

/** 列表「仅当前页」时：当前页批注正常显示，其它页批注淡化 */
function applyAnnotationScope(cfg: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!cfg) return null
  if (store.annotationListScope !== 'current' || props.pageIndex === store.currentPageIndex) {
    return cfg
  }
  const opacity = typeof cfg.opacity === 'number' ? cfg.opacity : 1
  return {
    ...cfg,
    opacity: opacity * 0.12,
    listening: false,
  }
}

async function refreshAnnotationLayer() {
  await nextTick()
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  annotationLayerRef.value?.getNode()?.batchDraw()
  stage.batchDraw()
}

function ensureActivePageForInteraction() {
  if (props.offscreen) return
  if (store.currentPageIndex !== props.pageIndex) {
    store.setCurrentPage(props.pageIndex, { preserveSelection: true })
  }
}
const annotationConfigs = computed(() =>
    visiblePageAnnotations.value.map(ann => ({
      ann,
      highlightCfg:   applyAnnotationScope(ann.type === 'HIGHLIGHT'   ? getHighlightConfig(ann)   : null),
      underlineCfg:   applyAnnotationScope(ann.type === 'UNDERLINE'   ? getUnderlineConfig(ann)   : null),
      strikeoutCfg:   applyAnnotationScope(ann.type === 'STRIKEOUT'   ? getStrikeoutConfig(ann)   : null),
      squigglyCfg:    applyAnnotationScope(ann.type === 'SQUIGGLY'    ? getSquigglyConfig(ann)    : null),
      replaceGroupCfg: applyAnnotationScope(ann.type === 'REPLACE'    ? getReplaceGroupConfig(ann) : null),
      replaceStrikeCfg: applyAnnotationScope(ann.type === 'REPLACE'   ? getReplaceStrikeConfig(ann) : null),
      replaceCaretCfg: applyAnnotationScope(ann.type === 'REPLACE'    ? getReplaceCaretConfig(ann) : null),
      replaceTextCfg:  applyAnnotationScope(ann.type === 'REPLACE'    ? getReplaceTextConfig(ann)  : null),
      rectangleCfg:   applyAnnotationScope(ann.type === 'RECTANGLE'   ? getRectangleConfig(ann)   : null),
      circleCfg:      applyAnnotationScope(ann.type === 'CIRCLE'      ? getCircleConfig(ann)      : null),
      arrowCfg:       applyAnnotationScope(ann.type === 'ARROW'       ? getArrowConfig(ann)       : null),
      freehandCfg:    applyAnnotationScope(ann.type === 'FREEHAND'    ? getFreehandConfig(ann)    : null),
      groupCfg:       applyAnnotationScope(['TEXTBOX','STICKYNOTE'].includes(ann.type) ? getAnnotationGroupConfig(ann) : null),
      textBoxBgCfg:   applyAnnotationScope(ann.type === 'TEXTBOX'     ? getTextBoxBgConfig(ann)   : null),
      textBoxTxtCfg:  applyAnnotationScope(ann.type === 'TEXTBOX'     ? getTextBoxTextConfig(ann) : null),
      stickyBgCfg:    applyAnnotationScope(ann.type === 'STICKYNOTE'  ? getStickyNoteBgConfig(ann): null),
      stickyTxtCfg:   applyAnnotationScope(ann.type === 'STICKYNOTE'  ? getStickyNoteTextConfig(ann): null),
      stampCfg:       applyAnnotationScope(ann.type === 'STAMP'       ? getStampConfig(ann)       : null),
      linkCfg:        applyAnnotationScope(ann.type === 'LINK'        ? getLinkConfig(ann)        : null),
    }))
)

watch(
    () => store.annotationListScope,
    () => { void refreshAnnotationLayer() },
)
// ─────────────────────────────────────────────
// 图章图片缓存
// ─────────────────────────────────────────────
const stampImageMap = reactive<Record<string, HTMLImageElement>>({})

function stampImageSrc(stampBase64?: string): string {
  if (!stampBase64) return ''
  if (stampBase64.startsWith('data:')) return stampBase64
  return `data:image/png;base64,${stampBase64}`
}

function toRawBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

function loadStampImage(ann: AnnotationData) {
  if (ann.type !== 'STAMP' || !ann.stampBase64 || stampImageMap[ann.id]) return
  const img = new window.Image()
  img.onload = () => {
    stampImageMap[ann.id] = img
    void refreshAnnotationLayer()
  }
  img.src = stampImageSrc(ann.stampBase64)
}

watch(
    () => pageAnnotations.value.map(a => a.id).join(','),
    () => {
      for (const ann of pageAnnotations.value) {
        loadStampImage(ann)
      }
    },
    { immediate: true },
)

// ─────────────────────────────────────────────
// OFD 元素 Transformer 跟踪
// ─────────────────────────────────────────────
async function refreshElementTransformer(elementId: string) {
  await nextTick()
  const transformer = transformerRef.value?.getNode()
  const stage       = stageRef.value?.getNode()
  if (!transformer || !stage || store.selectedElementId !== elementId) return
  const node = stage.findOne('#' + elementId)
  if (node) {
    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
  }
}

watch(() => store.selectedElementId, async (id) => {
  if (props.offscreen) return
  if (id && store.isSelectTool) await refreshElementTransformer(id)
  else {
    await nextTick()
    const transformer = transformerRef.value?.getNode()
    if (!transformer) return
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }
})

watch(() => store.currentTool, async (tool) => {
  if (props.offscreen) return
  if (tool !== 'SELECT') {
    await nextTick()
    const transformer = transformerRef.value?.getNode()
    if (!transformer) return
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  } else if (store.selectedElementId) {
    await refreshElementTransformer(store.selectedElementId)
  }
})

// ─────────────────────────────────────────────
// P1 直接选择 · PATH 锚点 overlay
// ─────────────────────────────────────────────
/** 本页是否拥有当前选中的 PATH（连续视图下勿在其它页画幽灵锚点） */
const pathEditElement = computed(() => {
  if (props.offscreen || !store.isDirectSelectTool || !store.selectedElementId) return null
  const el = props.page.elements.find(e => e.id === store.selectedElementId && !e.isDeleted)
  if (!el || el.type !== 'PATH' || !el.pathData) return null
  return el
})

const pathEditVisible = computed(() => !!pathEditElement.value)

/** 拖动主锚点索引；拖动期间冻结 overlay 配置，避免 Vue setAttrs 打断 Konva drag */
const draggingAnchorIndex = ref<number | null>(null)
const anchorDragging = ref(false)
const anchorMarquee = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
let anchorMarqueeActive = false
/** 拖动开始时各选中锚点的局部坐标 */
let anchorDragStarts: Record<number, { x: number; y: number }> = {}

const pathEditAnchors = computed(() => {
  const el = pathEditElement.value
  if (!el?.pathData) return []
  return extractAnchors(parsePathModel(el.pathData))
})

function buildPathEditAnchorConfigs() {
  const el = pathEditElement.value
  if (!el) return [] as { id: string; index: number; config: Record<string, unknown> }[]
  const ox = el.pathLocalCoords ? el.x : 0
  const oy = el.pathLocalCoords ? el.y : 0
  const selected = new Set(store.selectedAnchorIndices)
  return pathEditAnchors.value.map((a) => {
    const on = selected.has(a.index)
    const x = ox + a.point.x
    const y = oy + a.point.y
    return {
      id: `${el.id}-${a.index}`,
      index: a.index,
      config: {
        id: `path-anchor-${a.index}`,
        name: `path-anchor-${a.index}`,
        x: s(x),
        y: s(y),
        radius: on ? 5 : 4,
        fill: on ? '#1a73e8' : '#ffffff',
        stroke: '#1a73e8',
        strokeWidth: 1.5,
        hitStrokeWidth: 12,
        draggable: true,
        listening: true,
      },
    }
  })
}

/** 拖动中不更新，防止 Vue 把节点坐标刷回起点 */
const pathEditAnchorConfigs = ref(buildPathEditAnchorConfigs())

/** 贝塞尔手柄拖动状态（须在 watch 之前声明） */
const handleDragging = ref(false)
let handleDragBreakCorner = false
let handleDragAnchorIndex = -1
const pathHandleConfigs = ref<{ id: string; config: Record<string, unknown> }[]>([])
const pathHandleSpokeConfigs = ref<{ id: string; config: Record<string, unknown> }[]>([])

function visiblePathHandles() {
  const el = pathEditElement.value
  if (!el?.pathData) return []
  const all = extractHandles(parsePathModel(el.pathData))
  if (store.selectedAnchorIndices.length === 0) return all
  const sel = new Set(store.selectedAnchorIndices)
  return all.filter((h) => sel.has(h.anchorIndex))
}

function rebuildPathHandleOverlay() {
  if (handleDragging.value) return
  const el = pathEditElement.value
  if (!el) {
    pathHandleConfigs.value = []
    pathHandleSpokeConfigs.value = []
    return
  }
  const ox = el.pathLocalCoords ? el.x : 0
  const oy = el.pathLocalCoords ? el.y : 0
  const anchors = pathEditAnchors.value
  const handles = visiblePathHandles()
  pathHandleSpokeConfigs.value = handles.map((h) => {
    const a = anchors[h.anchorIndex]
    return {
      id: h.id,
      config: {
        name: `path-spoke-${h.id}`,
        points: a
            ? [s(ox + a.point.x), s(oy + a.point.y), s(ox + h.point.x), s(oy + h.point.y)]
            : [],
        stroke: '#1a73e8',
        strokeWidth: 1,
        dash: [3, 3],
        listening: false,
      },
    }
  })
  pathHandleConfigs.value = handles.map((h) => ({
    id: h.id,
    config: {
      id: `path-handle-${h.id.replace(':', '-')}`,
      name: `path-handle-${h.id}`,
      x: s(ox + h.point.x),
      y: s(oy + h.point.y),
      radius: 3.5,
      fill: '#1a73e8',
      stroke: '#ffffff',
      strokeWidth: 1,
      hitStrokeWidth: 10,
      draggable: true,
      listening: true,
    },
  }))
}

watch(
    [
      pathEditElement,
      pathEditAnchors,
      () => store.selectedAnchorIndices.slice(),
      () => renderScale.value,
      () => store.scale,
    ],
    () => {
      if (anchorDragging.value || handleDragging.value) return
      pathEditAnchorConfigs.value = buildPathEditAnchorConfigs()
      rebuildPathHandleOverlay()
    },
    { immediate: true, deep: true },
)

function handleBezierHandleMouseDown(e: any, handleId: string) {
  e.cancelBubble = true
  handleDragging.value = true
  handleDragBreakCorner = !!(e.evt?.altKey)
  const el = pathEditElement.value
  if (!el?.pathData) return
  const h = extractHandles(parsePathModel(el.pathData)).find((x) => x.id === handleId)
  handleDragAnchorIndex = h?.anchorIndex ?? -1
  if (h && !store.selectedAnchorIndices.includes(h.anchorIndex)) {
    store.setSelectedAnchors([h.anchorIndex])
  }
}

function handleBezierHandleDragMove(e: any, handleId: string) {
  e.cancelBubble = true
  const el = pathEditElement.value
  if (!el?.pathData || !handleDragging.value) return
  const ox = el.pathLocalCoords ? el.x : 0
  const oy = el.pathLocalCoords ? el.y : 0
  const localX = px2mm(e.target.x()) - ox
  const localY = px2mm(e.target.y()) - oy
  const stage = stageRef.value?.getNode?.()
  const a = pathEditAnchors.value[handleDragAnchorIndex]
  if (!a) return

  const spoke = pathHandleSpokeConfigs.value.find((s) => s.id === handleId)
  if (spoke) {
    spoke.config = {
      ...spoke.config,
      points: [s(ox + a.point.x), s(oy + a.point.y), s(ox + localX), s(oy + localY)],
    }
  }

  const model = parsePathModel(el.pathData)
  const resolved = handleDragBreakCorner
      ? 'corner' as const
      : inferAnchorSmoothMode(model, handleDragAnchorIndex)
  if (resolved === 'corner' || !stage) return

  const preview = moveHandle(model, handleId, { x: localX, y: localY }, resolved)
  const twin = extractHandles(preview).find(
      (t) => t.anchorIndex === handleDragAnchorIndex && t.id !== handleId,
  )
  if (!twin) return
  const node = stage.findOne(`#path-handle-${twin.id.replace(':', '-')}`)
  if (node) node.position({ x: s(ox + twin.point.x), y: s(oy + twin.point.y) })
  const twinSpoke = pathHandleSpokeConfigs.value.find((s) => s.id === twin.id)
  if (twinSpoke) {
    twinSpoke.config = {
      ...twinSpoke.config,
      points: [
        s(ox + a.point.x), s(oy + a.point.y),
        s(ox + twin.point.x), s(oy + twin.point.y),
      ],
    }
  }
}

function handleBezierHandleDragEnd(e: any, handleId: string) {
  e.cancelBubble = true
  const el = pathEditElement.value
  const ox = el?.pathLocalCoords ? el.x : 0
  const oy = el?.pathLocalCoords ? el.y : 0
  const localX = px2mm(e.target.x()) - ox
  const localY = px2mm(e.target.y()) - oy
  const breakCorner = handleDragBreakCorner
  handleDragging.value = false
  handleDragBreakCorner = false
  handleDragAnchorIndex = -1
  const mode = breakCorner ? 'corner' as const : undefined
  if (store.movePathHandle(handleId, localX, localY, mode)) {
    suppressClick.value = true
  }
  pathEditAnchorConfigs.value = buildPathEditAnchorConfigs()
  rebuildPathHandleOverlay()
}

function handleAnchorDblClick(e: any, index: number) {
  e.cancelBubble = true
  e.evt?.preventDefault?.()
  const mode = store.cycleSelectedAnchorSmoothMode(index)
  if (mode) {
    const label = mode === 'corner' ? '角点' : mode === 'smooth' ? '平滑' : '对称'
    ElMessage.success({ message: `锚点模式：${label}`, duration: 1000, showClose: false })
  }
  rebuildPathHandleOverlay()
}

/** 不可见宽线段，便于双击插入中点 */
const pathEditSegmentHits = computed(() => {
  const el = pathEditElement.value
  if (!el?.pathData) return [] as Record<string, unknown>[]
  const model = parsePathModel(el.pathData)
  const anchors = extractAnchors(model)
  const ox = el.pathLocalCoords ? el.x : 0
  const oy = el.pathLocalCoords ? el.y : 0
  const segs: Record<string, unknown>[] = []
  for (let i = 0; i < anchors.length - 1; i++) {
    const b = anchors[i + 1]
    if (model.commands[b.commandIndex]?.type !== 'L') continue
    const a = anchors[i]
    segs.push({
      name: `path-seg-${i}`,
      points: [s(ox + a.point.x), s(oy + a.point.y), s(ox + b.point.x), s(oy + b.point.y)],
      stroke: 'transparent',
      strokeWidth: 14,
      listening: true,
    })
  }
  return segs
})

const anchorMarqueeConfig = computed(() => {
  const m = anchorMarquee.value
  if (!m) return {}
  const x = Math.min(m.x0, m.x1)
  const y = Math.min(m.y0, m.y1)
  const w = Math.abs(m.x1 - m.x0)
  const h = Math.abs(m.y1 - m.y0)
  return {
    x: s(x),
    y: s(y),
    width: s(w),
    height: s(h),
    fill: 'rgba(26,115,232,0.12)',
    stroke: '#1a73e8',
    strokeWidth: 1,
    dash: [4, 4],
    listening: false,
  }
})

function handleAnchorClick(e: any, index: number) {
  e.cancelBubble = true
  if (suppressClick.value) return
  const additive = !!(e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey)
  store.togglePathAnchor(index, additive)
}

function handleAnchorMouseDown(e: any, index: number) {
  e.cancelBubble = true
  const additive = !!(e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey)
  if (!store.selectedAnchorIndices.includes(index) && !additive) {
    store.setSelectedAnchors([index])
  } else if (!store.selectedAnchorIndices.includes(index) && additive) {
    store.togglePathAnchor(index, true)
  }
  const el = pathEditElement.value
  if (!el) return
  draggingAnchorIndex.value = index
  anchorDragging.value = true
  anchorDragStarts = {}
  for (const a of pathEditAnchors.value) {
    if (store.selectedAnchorIndices.includes(a.index) || a.index === index) {
      anchorDragStarts[a.index] = { x: a.point.x, y: a.point.y }
    }
  }
}

function handleAnchorDragMove(e: any, index: number) {
  e.cancelBubble = true
  const el = pathEditElement.value
  if (!el || !anchorDragging.value) return
  const ox = el.pathLocalCoords ? el.x : 0
  const oy = el.pathLocalCoords ? el.y : 0
  const start = anchorDragStarts[index]
  if (!start) return
  const dx = px2mm(e.target.x()) - (ox + start.x)
  const dy = px2mm(e.target.y()) - (oy + start.y)
  // 多选时命令式移动其余锚点（不触发 Vue 配置刷新）
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  for (const i of Object.keys(anchorDragStarts).map(Number)) {
    if (i === index) continue
    const s0 = anchorDragStarts[i]
    if (!s0) continue
    const node = stage.findOne(`#path-anchor-${i}`)
    if (node) {
      node.position({ x: s(ox + s0.x + dx), y: s(oy + s0.y + dy) })
    }
  }
}

function handleAnchorDragEnd(e: any, index: number) {
  e.cancelBubble = true
  const el = pathEditElement.value
  const start = anchorDragStarts[index]
  const ox = el?.pathLocalCoords ? el.x : 0
  const oy = el?.pathLocalCoords ? el.y : 0
  let dx = 0
  let dy = 0
  if (el && start) {
    dx = px2mm(e.target.x()) - (ox + start.x)
    dy = px2mm(e.target.y()) - (oy + start.y)
  }
  anchorDragging.value = false
  draggingAnchorIndex.value = null
  anchorDragStarts = {}
  if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
    if (!store.selectedAnchorIndices.includes(index)) {
      store.setSelectedAnchors([index])
    }
    store.translateSelectedPathAnchors(dx, dy)
    suppressClick.value = true
  }
  pathEditAnchorConfigs.value = buildPathEditAnchorConfigs()
  rebuildPathHandleOverlay()
}

function handlePathSegmentDblClick(e: any, segIndex: number) {
  e.cancelBubble = true
  e.evt?.preventDefault?.()
  const el = pathEditElement.value
  if (!el?.pathData) return
  const model = parsePathModel(el.pathData)
  const anchors = extractAnchors(model)
  const a = anchors[segIndex]
  const b = anchors[segIndex + 1]
  if (!a || !b) return
  const midX = (a.point.x + b.point.x) / 2
  const midY = (a.point.y + b.point.y) / 2
  if (store.insertPathAnchorAtLocalPoint(midX, midY, 999)) {
    ElMessage.success({ message: '已插入锚点', duration: 1000, showClose: false })
  }
}

function finishAnchorMarquee(additive: boolean) {
  const m = anchorMarquee.value
  anchorMarquee.value = null
  anchorMarqueeActive = false
  if (!m || !pathEditVisible.value) return
  const el = pathEditElement.value
  if (!el) return
  const ox = el.pathLocalCoords ? el.x : 0
  const oy = el.pathLocalCoords ? el.y : 0
  const left = Math.min(m.x0, m.x1)
  const right = Math.max(m.x0, m.x1)
  const top = Math.min(m.y0, m.y1)
  const bottom = Math.max(m.y0, m.y1)
  if (right - left < 0.3 && bottom - top < 0.3) return
  const hit: number[] = []
  for (const a of pathEditAnchors.value) {
    const x = ox + a.point.x
    const y = oy + a.point.y
    if (x >= left && x <= right && y >= top && y <= bottom) hit.push(a.index)
  }
  if (additive) {
    store.setSelectedAnchors([...new Set([...store.selectedAnchorIndices, ...hit])])
  } else {
    store.setSelectedAnchors(hit)
  }
}

function onWindowAnchorMarqueeMove(e: MouseEvent) {
  if (!anchorMarqueeActive || !anchorMarquee.value) return
  const pos = getStagePosFromClient(e) ?? getStagePos()
  if (!pos) return
  anchorMarquee.value = { ...anchorMarquee.value, x1: pos.x, y1: pos.y }
}

function onWindowAnchorMarqueeUp(e: MouseEvent) {
  window.removeEventListener('mousemove', onWindowAnchorMarqueeMove)
  window.removeEventListener('mouseup', onWindowAnchorMarqueeUp)
  const additive = !!(e.shiftKey || e.ctrlKey || e.metaKey)
  finishAnchorMarquee(additive)
}

// ─────────────────────────────────────────────
// 注释 Transformer 跟踪
// ─────────────────────────────────────────────
watch(() => store.selectedAnnotationId, async (id) => {
  if (props.offscreen) return
  await nextTick()
  const transformer = annotationTransformerRef.value?.getNode()
  if (!transformer) return

  if (id && store.currentTool === 'SELECT') {
    const layer = annotationLayerRef.value?.getNode()
    layer?.getChildren().forEach((n: any) => {
      console.log('layer子节点 name:', n.name(), 'type:', n.getType(), 'className:', n.getClassName())
    })
    if (!layer) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const node = layer.findOne((n: any) => n.name() === id)
    const ann  = store.currentPageAnnotations.find(a => a.id === id)

    // ✅ 加这几行
    console.log('=== Transformer 诊断 ===')
    console.log('id:', id)
    console.log('ann:', ann)
    console.log('ann.type:', ann?.type)
    console.log('canResize:', ann ? RESIZABLE_TYPES.includes(ann.type) : false)
    console.log('node:', node)
    console.log('node.name():', node?.name?.())
    console.log('transformer:', transformer)
    console.log('transformer.enabledAnchors 方法存在:', typeof transformer.enabledAnchors)

    if (node) {
      transformer.nodes([node])
      const canResize = ann ? RESIZABLE_TYPES.includes(ann.type) : false
      const anchors = canResize
          ? ['top-left','top-center','top-right','middle-left','middle-right','bottom-left','bottom-center','bottom-right']
          : []
      console.log('设置 enabledAnchors:', anchors)
      transformer.enabledAnchors(anchors)
      console.log('设置后 enabledAnchors():', transformer.enabledAnchors())
    } else {
      transformer.nodes([])
    }
  } else {
    transformer.nodes([])
  }

  transformer.getLayer()?.batchDraw()
})

// ─────────────────────────────────────────────
// 绘制状态 & 预览配置
// ─────────────────────────────────────────────
const isDrawing     = ref(false)
const drawTool      = ref('')
const drawStartX    = ref(0)
const drawStartY    = ref(0)
const drawCurX      = ref(0)
const drawCurY      = ref(0)
const drawingPoints = ref<number[]>([])
const polylineActive = ref(false)
const polylinePoints = ref<{ x: number; y: number }[]>([])
const polylineCursor = ref<{ x: number; y: number } | null>(null)

const previewLayerConfig = computed(() => ({
  listening: false,
  visible:   isDrawing.value || polylineActive.value || penActive.value || penPlacing.value,
}))

const previewRectConfig = computed(() => {
  const wMm = Math.max(Math.abs(drawCurX.value - drawStartX.value), 0.5)
  const hMm = Math.max(Math.abs(drawCurY.value - drawStartY.value), 0.5)
  const isVector = drawTool.value === 'VECTOR_RECT'
  return {
    x:           s(Math.min(drawStartX.value, drawCurX.value)),
    y:           s(Math.min(drawStartY.value, drawCurY.value)),
    width:       s(wMm),
    height:      s(hMm),
    fill:        isVector
        ? (store.vectorFillEnabled ? store.vectorFillColor : 'transparent')
        : store.currentTool === 'HIGHLIGHT'
            ? store.annotationColor
            : store.currentTool === 'LINK'
                ? 'rgba(0, 120, 215, 0.12)'
                : 'transparent',
    opacity:     isVector ? 1 : store.annotationOpacity,
    stroke:      isVector
        ? store.vectorStrokeColor
        : store.currentTool === 'HIGHLIGHT'
            ? 'transparent'
            : store.currentTool === 'LINK'
                ? '#0078d4'
                : store.annotationColor,
    strokeWidth: isVector ? store.vectorLineWidth : store.annotationLineWidth,
    dash:        [4, 3],
    listening:   false,
  }
})

const previewVectorLineConfig = computed(() => {
  const sc = MM_TO_PX * renderScale.value
  return {
    points: [
      s(drawStartX.value), s(drawStartY.value),
      s(drawCurX.value),   s(drawCurY.value),
    ],
    stroke:      store.vectorStrokeColor,
    strokeWidth: store.vectorLineWidth,
    lineCap:     normalizeLineCap(store.vectorLineCap),
    lineJoin:    normalizeLineJoin(store.vectorLineJoin),
    dash:        dashPatternToKonva(store.vectorDashPattern, sc) ?? [4, 3],
    listening:   false,
  }
})

const previewPolylineConfig = computed(() => {
  const pts = polylinePoints.value
  if (pts.length === 0) return { points: [] as number[], listening: false }
  const flat: number[] = []
  for (const p of pts) flat.push(s(p.x), s(p.y))
  const cur = polylineCursor.value
  if (cur) flat.push(s(cur.x), s(cur.y))
  const sc = MM_TO_PX * renderScale.value
  const closed = drawTool.value === 'VECTOR_POLYGON' && pts.length >= 3 && !cur
  if (closed) flat.push(s(pts[0].x), s(pts[0].y))
  return {
    points:      flat,
    stroke:      store.vectorStrokeColor,
    strokeWidth: store.vectorLineWidth,
    lineCap:     normalizeLineCap(store.vectorLineCap),
    lineJoin:    normalizeLineJoin(store.vectorLineJoin),
    dash:        dashPatternToKonva(store.vectorDashPattern, sc),
    closed:      false,
    listening:   false,
  }
})

const previewPenPathConfig = computed(() => {
  const sc = MM_TO_PX * renderScale.value
  const draft = penPlacing.value && penDraftPoint.value && !penClosing.value
      ? {
          point: penDraftPoint.value,
          inHandle: penDraftOut.value
              ? mirrorHandle(penDraftPoint.value, penDraftOut.value)
              : null,
          outHandle: penDraftOut.value,
        }
      : null
  const cursor = (!penPlacing.value && penCursor.value) ? penCursor.value : null
  const model = buildPenPreviewModel(penKnots.value, cursor, draft)
  return {
    data:               serializePathModel(model),
    x:                  0,
    y:                  0,
    scaleX:             sc,
    scaleY:             sc,
    stroke:             store.vectorStrokeColor,
    strokeWidth:        store.vectorLineWidth,
    strokeScaleEnabled: false,
    fill:               'transparent',
    lineCap:            normalizeLineCap(store.vectorLineCap),
    lineJoin:           normalizeLineJoin(store.vectorLineJoin),
    dash:               dashPatternToKonva(store.vectorDashPattern, sc) ?? [4, 3],
    listening:          false,
  }
})

const previewPenSpokeConfigs = computed(() => {
  const lines: Record<string, unknown>[] = []
  const pushSpoke = (anchor: { x: number; y: number }, handle: { x: number; y: number } | null) => {
    if (!handle) return
    lines.push({
      points: [s(anchor.x), s(anchor.y), s(handle.x), s(handle.y)],
      stroke: '#1a73e8',
      strokeWidth: 1,
      dash: [3, 3],
      listening: false,
    })
  }
  for (const k of penKnots.value) {
    pushSpoke(k.point, k.inHandle)
    pushSpoke(k.point, k.outHandle)
  }
  if (penPlacing.value && penDraftPoint.value && penDraftOut.value) {
    const p = penDraftPoint.value
    const out = penDraftOut.value
    pushSpoke(p, out)
    pushSpoke(p, mirrorHandle(p, out))
  }
  return lines
})

const previewPenDotConfigs = computed(() => {
  const dots: Record<string, unknown>[] = []
  const add = (p: { x: number; y: number }, r = 3.5, fill = '#1a73e8') => {
    dots.push({
      x: s(p.x), y: s(p.y), radius: r,
      fill, stroke: '#fff', strokeWidth: 1, listening: false,
    })
  }
  for (const k of penKnots.value) {
    add(k.point, 4, '#ffffff')
    if (k.inHandle) add(k.inHandle, 3)
    if (k.outHandle) add(k.outHandle, 3)
  }
  if (penPlacing.value && penDraftPoint.value) {
    add(penDraftPoint.value, 4, '#ffffff')
    if (penDraftOut.value) {
      add(penDraftOut.value, 3)
      add(mirrorHandle(penDraftPoint.value, penDraftOut.value), 3)
    }
  }
  return dots
})

const previewEllipseConfig = computed(() => {
  const rx = s(Math.abs(drawCurX.value - drawStartX.value)) / 2
  const ry = s(Math.abs(drawCurY.value - drawStartY.value)) / 2
  const isVector = drawTool.value === 'VECTOR_ELLIPSE'
  return {
    x:           s(Math.min(drawStartX.value, drawCurX.value)) + rx,
    y:           s(Math.min(drawStartY.value, drawCurY.value)) + ry,
    radiusX:     rx,
    radiusY:     ry,
    fill:        isVector && store.vectorFillEnabled ? store.vectorFillColor : 'transparent',
    stroke:      isVector ? store.vectorStrokeColor : store.annotationColor,
    strokeWidth: isVector ? store.vectorLineWidth : store.annotationLineWidth,
    dash:        [4, 3],
  }
})

const previewFreehandConfig = computed(() => ({
  points:      drawingPoints.value,
  stroke:      store.annotationColor,
  strokeWidth: store.annotationLineWidth,
  lineCap:     'round' as const,
  lineJoin:    'round' as const,
  opacity:     store.annotationOpacity,
  tension:     0.4,
}))

const previewArrowConfig = computed(() => ({
  points: [
    s(drawStartX.value), s(drawStartY.value),
    s(drawCurX.value),   s(drawCurY.value),
  ],
  stroke:        store.annotationColor,
  strokeWidth:   store.annotationLineWidth,
  fill:          store.annotationColor,
  opacity:       store.annotationOpacity,
  pointerLength: 12,
  pointerWidth:  8,
  lineJoin:      'round' as const,
}))

const previewUnderlineConfig = computed(() => ({
  points: [
    s(drawStartX.value), s(drawCurY.value),
    s(drawCurX.value),   s(drawCurY.value),
  ],
  stroke:      store.annotationColor,
  strokeWidth: store.annotationLineWidth,
}))

const previewStrikeoutConfig = computed(() => {
  const midY = (drawStartY.value + drawCurY.value) / 2
  return {
    points: [
      s(drawStartX.value), s(midY),
      s(drawCurX.value),   s(midY),
    ],
    stroke:      store.annotationColor,
    strokeWidth: store.annotationLineWidth,
  }
})

const previewSquigglyConfig = computed(() => {
  const x0 = Math.min(drawStartX.value, drawCurX.value)
  const y0 = Math.max(drawStartY.value, drawCurY.value)
  const w = Math.abs(drawCurX.value - drawStartX.value)
  const pts = buildSquigglyRelativePoints(w, 0)
  return {
    points: relativePointsToKonva(x0, y0, pts, s),
    stroke:      store.annotationColor,
    strokeWidth: store.annotationLineWidth,
    lineCap:     'round' as const,
    lineJoin:    'round' as const,
  }
})

const previewReplaceMidY = computed(() => (drawStartY.value + drawCurY.value) / 2)
const previewReplaceX0 = computed(() => Math.min(drawStartX.value, drawCurX.value))
const previewReplaceWidth = computed(() =>
    Math.max(Math.abs(drawCurX.value - drawStartX.value), Math.abs(drawCurY.value - drawStartY.value), 0.5),
)

const previewReplaceGroupConfig = computed(() => ({
  x: s(previewReplaceX0.value),
  y: s(previewReplaceMidY.value),
}))

const previewReplaceStrikeConfig = computed(() => ({
  points: [0, 0, s(previewReplaceWidth.value), 0],
  stroke:      store.annotationColor,
  strokeWidth: store.annotationLineWidth,
  listening:   false,
}))

const previewReplaceCaretConfig = computed(() => ({
  points: [0, 0, s(2), s(-3), s(4), 0],
  stroke:      store.annotationColor,
  strokeWidth: store.annotationLineWidth,
  lineCap:     'round' as const,
  lineJoin:    'round' as const,
  listening:   false,
}))

// ─────────────────────────────────────────────
// 文本注释编辑弹窗
// ─────────────────────────────────────────────
const textEditVisible  = ref(false)
const textEditCommitted = ref(false)
const textEditContent  = ref('')
const textEditTargetId = ref<string | null>(null)
const textEditMode     = ref<'textbox' | 'replace' | 'typewriter'>('textbox')
let pendingTextAnn: Omit<AnnotationData, 'id' | 'createdAt' | 'updatedAt'> | null = null
let pendingReplaceAnn: Omit<AnnotationData, 'id' | 'createdAt' | 'updatedAt'> | null = null
let pendingTypewriterPos: { x: number; y: number } | null = null
let pendingLinkAnn: Omit<AnnotationData, 'id' | 'createdAt' | 'updatedAt'> | null = null

const linkDialogVisible = ref(false)
const linkCommitted = ref(false)
const linkEditTargetId = ref<string | null>(null)
const linkDialogInitial = ref<Partial<AnnotationData> | null>(null)

function openLinkDialog(ann?: AnnotationData) {
  if (ann) {
    linkEditTargetId.value = ann.id
    linkDialogInitial.value = {
      actionType: ann.actionType,
      targetPageIndex: ann.targetPageIndex,
      uri: ann.uri,
      content: ann.content,
    }
  } else {
    linkEditTargetId.value = null
    linkDialogInitial.value = {
      actionType: 'GOTO_PAGE',
      targetPageIndex: props.pageIndex,
    }
  }
  linkDialogVisible.value = true
}

async function confirmLinkAction(payload: {
  actionType: LinkActionType
  targetPageIndex?: number
  uri?: string
  content?: string
}) {
  if (linkEditTargetId.value) {
    await store.updateAnnotation(linkEditTargetId.value, {
      actionType: payload.actionType,
      targetPageIndex: payload.actionType === 'GOTO_PAGE' ? payload.targetPageIndex : undefined,
      uri: payload.actionType === 'URI' ? payload.uri : undefined,
      content: payload.content,
    })
    linkEditTargetId.value = null
    ElMessage.success({ message: '链接已更新', duration: 1200, showClose: false })
    return
  }
  const pending = pendingLinkAnn
  if (!pending) return
  linkCommitted.value = true
  pendingLinkAnn = null
  const result = await store.addAnnotation({
    ...pending,
    actionType: payload.actionType,
    targetPageIndex: payload.actionType === 'GOTO_PAGE' ? payload.targetPageIndex : undefined,
    uri: payload.actionType === 'URI' ? payload.uri : undefined,
    content: payload.content,
  })
  if (result) {
    await nextTick()
    await refreshAnnotationLayer()
    ElMessage.success({ message: '链接已添加', duration: 1200, showClose: false })
  } else {
    ElMessage.error('链接保存失败，请检查后端连接')
  }
}

watch(linkDialogVisible, (open) => {
  if (open) return
  if (!linkCommitted.value) pendingLinkAnn = null
  linkCommitted.value = false
  linkEditTargetId.value = null
})

function onLinkDialogCancel() {
  pendingLinkAnn = null
}

const textEditDialogTitle = computed(() => {
  if (textEditMode.value === 'replace') return '替换文本'
  if (textEditMode.value === 'typewriter') return '打字机 — 插入正文文字'
  return '编辑注释文本'
})

const textEditPlaceholder = computed(() => {
  if (textEditMode.value === 'replace') return '请输入替换后的文字...'
  if (textEditMode.value === 'typewriter') return '请输入要写入正文的文字...'
  return '请输入注释内容...'
})

function openTextEdit(ann?: AnnotationData, mode: 'textbox' | 'replace' | 'typewriter' = 'textbox') {
  textEditMode.value = mode
  if (ann) {
    textEditTargetId.value = ann.id
    textEditContent.value  = ann.content ?? ''
  } else {
    textEditTargetId.value = null
    textEditContent.value  = ''
  }
  textEditVisible.value = true
}

async function confirmTextEdit() {
  const text = textEditContent.value.trim()
  if (!text) {
    const msg = textEditMode.value === 'replace'
        ? '替换文本不能为空'
        : textEditMode.value === 'typewriter'
            ? '正文文字不能为空'
            : '注释内容不能为空'
    ElMessage.warning(msg)
    return
  }
  textEditCommitted.value = true
  if (textEditTargetId.value) {
    await store.updateAnnotation(textEditTargetId.value, { content: text })
  } else if (pendingReplaceAnn) {
    const payload = { ...pendingReplaceAnn, content: text }
    pendingReplaceAnn = null
    const result = await store.addAnnotation(payload)
    if (result) {
      await refreshAnnotationLayer()
      ElMessage.success({ message: '注释已添加', duration: 1200, showClose: false })
    } else {
      ElMessage.error('注释保存失败，请检查后端连接')
    }
  } else if (textEditMode.value === 'typewriter' && pendingTypewriterPos) {
    const pos = pendingTypewriterPos
    pendingTypewriterPos = null
    const id = store.addTypewriterText(props.pageIndex, pos.x, pos.y, text)
    if (id) {
      ElMessage.success({ message: '文字已添加到正文，保存后写入 OFD', duration: 1800, showClose: false })
    }
  } else if (pendingTextAnn) {
    const payload = { ...pendingTextAnn, content: text }
    pendingTextAnn = null
    await store.addAnnotation(payload)
  }
  textEditVisible.value = false
}

function cancelTextEdit() {
  textEditVisible.value = false
}

function onTextEditDialogClosed() {
  if (!textEditCommitted.value) {
    pendingTextAnn = null
    pendingReplaceAnn = null
    pendingTypewriterPos = null
  }
  textEditCommitted.value = false
  textEditTargetId.value = null
  textEditContent.value = ''
  textEditMode.value = 'textbox'
}

// ─────────────────────────────────────────────
// 获取 Stage 鼠标坐标（mm）
// ─────────────────────────────────────────────
function viewRotationDeg(): number {
  return props.offscreen
      ? normalizeViewRotation(props.page.pageRotate ?? 0)
      : normalizeViewRotation((props.page.pageRotate ?? 0) + store.viewRotation)
}

function getStagePos(): { x: number; y: number } | null {
  const stage = stageRef.value?.getNode()
  if (!stage) return null
  const pos = stage.getPointerPosition()
  if (!pos) return null
  if (viewRotationDeg() === 0) {
    return { x: px2mm(pos.x), y: px2mm(pos.y) }
  }
  const local = stage.getAbsoluteTransform().copy().invert().point(pos)
  return { x: px2mm(local.x), y: px2mm(local.y) }
}

function getStagePosFromClient(client: { clientX: number; clientY: number }): { x: number; y: number } | null {
  const stage = stageRef.value?.getNode()
  if (!stage) return null
  const box = stage.container().getBoundingClientRect()
  let local = { x: client.clientX - box.left, y: client.clientY - box.top }
  if (viewRotationDeg() !== 0) {
    local = stage.getAbsoluteTransform().copy().invert().point(local)
  }
  return { x: px2mm(local.x), y: px2mm(local.y) }
}

function isDrawTooSmall(tool: string, width: number, height: number): boolean {
  if (tool === 'FREEHAND') return false
  if (tool === 'LINK') return width < 1 || height < 1
  if (tool === 'REPLACE') return Math.max(width, height) < 1
  return Math.max(width, height) < 1
}

// ─────────────────────────────────────────────
// 手型工具：拖拽平移编辑区滚动条
// ─────────────────────────────────────────────
const isPanning = ref(false)
const suppressClick = ref(false)
const panStart = { clientX: 0, clientY: 0, scrollLeft: 0, scrollTop: 0, moved: false }

function getScrollContainer(): HTMLElement | null {
  return wrapperRef.value?.closest('.editor-area') as HTMLElement | null
}

function onPanMove(e: MouseEvent) {
  if (!isPanning.value) return
  const sc = getScrollContainer()
  if (!sc) return
  const dx = e.clientX - panStart.clientX
  const dy = e.clientY - panStart.clientY
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panStart.moved = true
  sc.scrollLeft = panStart.scrollLeft - dx
  sc.scrollTop = panStart.scrollTop - dy
}

function onPanEnd() {
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
  if (isPanning.value && panStart.moved) suppressClick.value = true
  isPanning.value = false
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
  window.removeEventListener('keydown', onPolylineKeydown)
  stopDrawSession()
  stopPolylineSession()
  cancelPenDraw()
  if (pdfRenderTimer) clearTimeout(pdfRenderTimer)
})

// ─────────────────────────────────────────────
// 鼠标事件
// ─────────────────────────────────────────────
function handleMouseDown(e: any) {
  if (props.offscreen) return
  if (store.isAnnotationTool || store.isVectorTool) ensureActivePageForInteraction()
  if (store.isHandTool) {
    if (e.evt?.button !== 0) return
    const sc = getScrollContainer()
    if (!sc) return
    isPanning.value = true
    panStart.clientX = e.evt.clientX
    panStart.clientY = e.evt.clientY
    panStart.scrollLeft = sc.scrollLeft
    panStart.scrollTop = sc.scrollTop
    panStart.moved = false
    e.evt.preventDefault()
    window.addEventListener('mousemove', onPanMove)
    window.addEventListener('mouseup', onPanEnd)
    return
  }

  // 直接选择：仅在空白处拖出橡皮筋（点 PATH / 其它元素不抢点击）
  if (store.isDirectSelectTool && pathEditVisible.value) {
    const name = typeof e.target?.name === 'function' ? e.target.name() : ''
    const isAnchor = typeof name === 'string' && name.startsWith('path-anchor-')
    const isSeg = typeof name === 'string' && name.startsWith('path-seg-')
    const isHandle = typeof name === 'string' && name.startsWith('path-handle-')
    const isBackground = e.target === e.target.getStage?.() || name === 'page-bg'
    if (isBackground && !isAnchor && !isSeg && !isHandle && e.evt?.button === 0) {
      const pos = getStagePos()
      if (pos) {
        ensureActivePageForInteraction()
        anchorMarqueeActive = true
        anchorMarquee.value = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y }
        window.addEventListener('mousemove', onWindowAnchorMarqueeMove)
        window.addEventListener('mouseup', onWindowAnchorMarqueeUp)
        e.evt.preventDefault()
        return
      }
    }
  }

  // 钢笔（贝塞尔）：按下落点，拖拽出柄；靠近起点闭合
  if (store.isPenTool) {
    ensureActivePageForInteraction()
    if (e.evt?.button === 2) {
      e.evt.preventDefault()
      void finishPenDraw(false)
      return
    }
    if (e.evt?.button !== 0) return
    if (e.evt.detail >= 2) return
    const pos = getStagePos()
    if (!pos) return
    e.evt.preventDefault()
    if (!penActive.value) {
      drawTool.value = 'VECTOR_PEN'
      beginPenPlace(pos, false)
      return
    }
    if (penKnots.value.length >= 3) {
      const first = penKnots.value[0].point
      if (Math.hypot(pos.x - first.x, pos.y - first.y) <= PEN_CLOSE_THRESHOLD_MM) {
        beginPenPlace(first, true)
        return
      }
    }
    beginPenPlace(pos, false)
    return
  }

  // 折线 / 多边形：页内任意位置单击加点
  if (store.isPolylineTool) {
    ensureActivePageForInteraction()
    if (e.evt?.button === 2) {
      e.evt.preventDefault()
      void finishPolylineDraw(store.currentTool === 'VECTOR_POLYGON')
      return
    }
    if (e.evt?.button !== 0) return
    if (e.evt.detail >= 2) return
    const pos = getStagePos()
    if (!pos) return
    e.evt.preventDefault()
    if (!polylineActive.value) {
      polylineActive.value = true
      drawTool.value = store.currentTool
      polylinePoints.value = [{ x: pos.x, y: pos.y }]
      polylineCursor.value = { x: pos.x, y: pos.y }
      startPolylineSession()
    } else {
      polylinePoints.value.push({ x: pos.x, y: pos.y })
    }
    return
  }

  if (!store.isAnnotationTool && !store.isVectorTool) return
  if (e.evt?.button !== 0) return
  if (['STAMP', 'TEXTBOX', 'STICKYNOTE'].includes(store.currentTool)) return
  const pos = getStagePos()
  if (!pos) return
  isDrawing.value     = true
  drawTool.value      = store.currentTool
  drawStartX.value    = pos.x
  drawStartY.value    = pos.y
  drawCurX.value      = pos.x
  drawCurY.value      = pos.y
  drawingPoints.value = [s(pos.x), s(pos.y)]
  startDrawSession()
  e.evt?.preventDefault?.()
}

function startDrawSession() {
  window.addEventListener('mousemove', onWindowDrawMouseMove)
  window.addEventListener('mouseup', onWindowDrawMouseUp)
}

function stopDrawSession() {
  window.removeEventListener('mousemove', onWindowDrawMouseMove)
  window.removeEventListener('mouseup', onWindowDrawMouseUp)
}

function onWindowDrawMouseMove(e: MouseEvent) {
  if (!isDrawing.value) return
  const pos = getStagePosFromClient(e) ?? getStagePos()
  if (!pos) return
  drawCurX.value = pos.x
  drawCurY.value = pos.y
  if (drawTool.value === 'FREEHAND') {
    const lx = s(pos.x)
    const ly = s(pos.y)
    const pts = drawingPoints.value
    if (pts.length < 2 || pts[pts.length - 2] !== lx || pts[pts.length - 1] !== ly) {
      pts.push(lx, ly)
    }
  }
}

function handleMouseMove() {
  if (!isDrawing.value) return
  const pos = getStagePos()
  if (!pos) return
  drawCurX.value = pos.x
  drawCurY.value = pos.y
  if (drawTool.value === 'FREEHAND') {
    const lx = s(pos.x)
    const ly = s(pos.y)
    const pts = drawingPoints.value
    if (pts.length < 2 || pts[pts.length - 2] !== lx || pts[pts.length - 1] !== ly) {
      pts.push(lx, ly)
    }
  }
}

function onWindowDrawMouseUp() {
  scheduleFinishDraw()
}

function handleMouseUp() {
  scheduleFinishDraw()
}

function scheduleFinishDraw() {
  setTimeout(() => { void finishDraw() }, 0)
}

/** 等预览层隐藏后再改注释层，避免同一帧内 vue-konva 结构冲突 */
function waitForKonvaSettle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

let finishingDraw = false

async function finishDraw() {
  if (!isDrawing.value || finishingDraw) return
  finishingDraw = true

  const tool = drawTool.value
  const endX = drawCurX.value
  const endY = drawCurY.value
  const x = Math.min(drawStartX.value, endX)
  const y = Math.min(drawStartY.value, endY)
  const width = Math.abs(endX - drawStartX.value)
  const height = Math.abs(endY - drawStartY.value)

  stopDrawSession()
  isDrawing.value = false

  try {
    if (tool === 'FREEHAND' && drawingPoints.value.length < 6) return
    if (['VECTOR_LINE', 'VECTOR_RECT', 'VECTOR_ELLIPSE'].includes(tool)) {
      if (tool === 'VECTOR_LINE') {
        if (Math.hypot(endX - drawStartX.value, endY - drawStartY.value) < 1) return
      } else if (isDrawTooSmall(tool, width, height)) {
        return
      }
      await waitForKonvaSettle()
      store.addVectorShape(
          props.pageIndex,
          tool as 'VECTOR_LINE' | 'VECTOR_RECT' | 'VECTOR_ELLIPSE',
          drawStartX.value,
          drawStartY.value,
          endX,
          endY,
      )
      return
    }
    if (isDrawTooSmall(tool, width, height)) {
      if (tool === 'LINK') {
        ElMessage.warning('请拖选矩形热区（需同时拖出宽度和高度）')
      } else if (tool === 'REPLACE') {
        ElMessage.warning('请沿文字方向拖选替换范围')
      }
      return
    }

    await waitForKonvaSettle()

    if (tool === 'REPLACE') {
      const span = Math.max(width, height)
      const midY = y + height / 2
      pendingReplaceAnn = {
        type:        'REPLACE',
        pageIndex:   props.pageIndex,
        x,
        y:           midY,
        width:       span,
        height:      0,
        opacity:     store.annotationOpacity,
        color:       store.annotationColor,
        strokeColor: store.annotationColor,
        lineWidth:   store.annotationLineWidth,
        fontSize:    12,
        fontColor:   '#2980b9',
        pathPoints:  [[0, 0], [span, 0]],
      }
      openTextEdit(undefined, 'replace')
      return
    }

    if (tool === 'LINK') {
      pendingLinkAnn = {
        type:        'LINK',
        pageIndex:   props.pageIndex,
        x, y, width, height,
        opacity:     0.85,
        strokeColor: '#0078d4',
        lineWidth:   store.annotationLineWidth,
      }
      openLinkDialog()
      return
    }

    await commitAnnotation(tool, x, y, width, height)
  } finally {
    finishingDraw = false
  }
}

function handleMouseLeave() {
  // 绘制中不在 mouseleave 时取消，由 window mouseup 完成拖选
}

function handleStageContextMenu(e: any) {
  if (props.offscreen) return
  if (store.isPenTool && (penActive.value || penPlacing.value)) {
    e.evt?.preventDefault?.()
    void finishPenDraw(false)
    return
  }
  if (!store.isPolylineTool || !polylineActive.value) return
  e.evt?.preventDefault?.()
  void finishPolylineDraw()
}

function handleStageDblClick(e: any) {
  if (props.offscreen) return
  if (store.isDirectSelectTool && pathEditVisible.value) {
    const pos = getStagePos()
    if (pos) {
      const el = pathEditElement.value
      if (el?.pathData) {
        const localX = pos.x - (el.pathLocalCoords ? el.x : 0)
        const localY = pos.y - (el.pathLocalCoords ? el.y : 0)
        if (store.insertPathAnchorAtLocalPoint(localX, localY, 2.5)) {
          e.evt?.preventDefault?.()
          ElMessage.success({ message: '已插入锚点', duration: 1000, showClose: false })
          return
        }
      }
    }
  }
  if (store.isPenTool && penActive.value) {
    e.evt?.preventDefault?.()
    // 双击会多落一个点，去掉末点后结束
    if (penKnots.value.length >= 2) {
      const last = penKnots.value[penKnots.value.length - 1]
      const prev = penKnots.value[penKnots.value.length - 2]
      if (Math.hypot(last.point.x - prev.point.x, last.point.y - prev.point.y) < 0.5) {
        penKnots.value.pop()
      }
    }
    void finishPenDraw(false)
    return
  }
  if (!store.isPolylineTool || !polylineActive.value) return
  e.evt?.preventDefault?.()
  const pts = polylinePoints.value
  if (pts.length >= 2) {
    const last = pts[pts.length - 1]
    const prev = pts[pts.length - 2]
    if (Math.hypot(last.x - prev.x, last.y - prev.y) < 0.5) {
      pts.pop()
    }
  }
  void finishPolylineDraw()
}

function handleStageClick(e: any) {
  if (props.offscreen) return
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  if (store.isHandTool) return

  const name         = typeof e.target?.name === 'function' ? e.target.name() : ''
  const isBackground = e.target === e.target.getStage() || name === 'page-bg'
  const pos = getStagePos()

  if (store.isTypewriterTool) {
    if (isBackground) store.selectElement(null)
    if (!isBackground || !pos) return
    pendingTypewriterPos = { x: pos.x, y: pos.y }
    openTextEdit(undefined, 'typewriter')
    return
  }

  if (store.isDirectSelectTool) {
    if (isBackground) {
      if (store.selectedAnchorIndices.length > 0) {
        store.clearPathAnchorSelection()
      } else {
        store.selectElement(null)
      }
    }
    return
  }

  if (!store.isAnnotationTool) {
    if (isBackground) store.selectElement(null)
    return
  }
  if (isBackground) store.selectAnnotation(null)
  if (!isBackground) return
  if (!pos) return
  if (['TEXTBOX', 'STICKYNOTE'].includes(store.currentTool)) {
    pendingTextAnn = {
      type:        store.currentTool as any,
      pageIndex:   props.pageIndex,
      x:           pos.x,
      y:           pos.y,
      width:       60,
      height:      30,
      opacity:     store.annotationOpacity,
      fontSize:    12,
      fontColor:   '#000000',
      color:       store.currentTool === 'STICKYNOTE' ? '#FFFACD' : 'transparent',
      strokeColor: '#999999',
      lineWidth:   1,
    }
    openTextEdit()
    return
  }
  if (store.currentTool === 'STAMP') {
    const stampSrc = store.pendingStampImage
    if (!stampSrc) {
      ElMessage.warning('请先在「图章库」或「导入图章/签名」中选择图章/签名')
      return
    }
    void placeStampAt(pos.x, pos.y, stampSrc)
  }
}

// ─────────────────────────────────────────────
// 图章放置
// ─────────────────────────────────────────────
async function placeStampAt(clickX: number, clickY: number, dataUrl: string) {
  try {
    const { width: pxW, height: pxH } = await loadImageDimensions(dataUrl)
    let wMm = pxW / MM_TO_PX
    let hMm = pxH / MM_TO_PX
    const maxSize = 40
    if (wMm > maxSize || hMm > maxSize) {
      const scale = maxSize / Math.max(wMm, hMm)
      wMm *= scale
      hMm *= scale
    }
    const x = Math.max(0, clickX - wMm / 2)
    const y = Math.max(0, clickY - hMm / 2)

    const result = await store.addAnnotation({
      type: 'STAMP',
      pageIndex: props.pageIndex,
      x, y, width: wMm, height: hMm,
      opacity: store.annotationOpacity,
      stampBase64: toRawBase64(dataUrl),
    })
    if (result) {
      loadStampImage(result)
      await refreshAnnotationLayer()
      ElMessage.success({ message: '图章已添加', duration: 1200, showClose: false })
    } else {
      ElMessage.error('图章保存失败，请检查后端连接')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '放置图章失败')
  }
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('无法解析图章图片'))
    img.src = src
  })
}

function handleElementClick(e: any, elementId: string) {
  if (suppressClick.value) return
  if (!store.isSelectTool && !store.isDirectSelectTool) return
  ensureActivePageForInteraction()
  const el = props.page.elements.find(item => item.id === elementId)
  if (el?.type === 'SEAL') return
  e.cancelBubble = true
  if (store.isDirectSelectTool && el?.type !== 'PATH') {
    ElMessage.info({ message: '直接选择仅用于 PATH 锚点编辑', duration: 1500, showClose: false })
    return
  }
  store.selectElement(elementId)
}

function handleAnnotationClick(e: any, id: string) {
  e.cancelBubble = true
  if (suppressClick.value) return
  ensureActivePageForInteraction()
  const ann = pageAnnotations.value.find(a => a.id === id)
  if (store.isHandTool && ann?.type === 'LINK') {
    store.executeLinkAction(ann)
    return
  }
  if (store.currentTool === 'SELECT') store.selectAnnotation(id)
}

function handleAnnotationDblClick(e: any, id: string) {
  e.cancelBubble = true
  const ann = pageAnnotations.value.find(a => a.id === id)
  if (ann?.type === 'LINK') {
    if (store.isHandTool || store.currentTool === 'SELECT') {
      store.executeLinkAction(ann)
    }
    return
  }
  if (ann && ['TEXTBOX', 'STICKYNOTE', 'REPLACE'].includes(ann.type)) {
    openTextEdit(ann, ann.type === 'REPLACE' ? 'replace' : 'textbox')
  }
}

// ─────────────────────────────────────────────
// ✅ 注释拖拽结束
//
// 核心原则：
//   Konva draggable 节点在 dragend 时，node.x() / node.y()
//   返回的是节点当前在 layer 内的【绝对像素坐标】。
//
//   对于 RECT 类（HIGHLIGHT / RECTANGLE / TEXTBOX / STICKYNOTE / STAMP）：
//     渲染时 x = s(ann.x)，拖动后 node.x() = 新的绝对 px
//     → newX(mm) = px2mm(node.x())
//     → 重置 node.x(s(newX)) 让 Konva 不再持有位移
//
//   对于 ELLIPSE（CIRCLE）：
//     渲染时 x = s(ann.x) + rx（圆心），拖动后 node.x() = 新圆心 px
//     → newCx(mm) = px2mm(node.x())
//     → newX(mm)  = newCx - ann.width/2
//     → 重置 node.x(s(newX) + rx)
//
//   对于 LINE 类（UNDERLINE / STRIKEOUT / ARROW / FREEHAND）：
//     这些节点本身 x=0，y=0，points 存绝对坐标；
//     拖动后 node.x() = 位移 px（因为起始 x=0）
//     → dx(mm) = px2mm(node.x())
//     → newX = ann.x + dx
//     → 重置 node.x(0) / node.y(0)
// ─────────────────────────────────────────────
async function handleAnnotationDragEnd(e: any, ann: AnnotationData) {
  const node = e.target

  let newX: number
  let newY: number

  if (ann.type === 'CIRCLE') {
    // 圆心坐标 → 左上角
    const newCx = px2mm(node.x())
    const newCy = px2mm(node.y())
    newX = newCx - (ann.width  ?? 0) / 2
    newY = newCy - (ann.height ?? 0) / 2
    // 重置回圆心坐标
    node.x(s(newX) + s((ann.width  ?? 0) / 2))
    node.y(s(newY) + s((ann.height ?? 0) / 2))
  } else if (['UNDERLINE', 'STRIKEOUT', 'SQUIGGLY', 'ARROW', 'FREEHAND'].includes(ann.type)) {
    // 这些节点渲染时 x=0/y=0，拖动后的 x/y 就是位移
    const dx = px2mm(node.x())
    const dy = px2mm(node.y())
    newX = ann.x + dx
    newY = ann.y + dy
    node.x(0)
    node.y(0)
  } else if (ann.type === 'REPLACE') {
    const offset = replaceTextOffsetMm(ann)
    newX = px2mm(node.x())
    newY = px2mm(node.y()) + offset
    node.x(s(newX))
    node.y(s(newY - offset))
  } else {
    // HIGHLIGHT / RECTANGLE / TEXTBOX / STICKYNOTE / STAMP / GROUP
    // 渲染时 x = s(ann.x)，拖动后 node.x() 是新的绝对 px
    newX = px2mm(node.x())
    newY = px2mm(node.y())
    node.x(s(newX))
    node.y(s(newY))
  }

  await store.updateAnnotation(ann.id, { x: newX, y: newY })
  await nextTick()
  node.getLayer()?.batchDraw()
}

// ─────────────────────────────────────────────
// 注释变换结束（锚点缩放）
//
// 只有 RESIZABLE_TYPES 会进入此逻辑（其余类型 enabledAnchors=[]）。
//
// RECT 类（RECTANGLE / TEXTBOX / STICKYNOTE / STAMP）：
//   Transformer 缩放时会修改 scaleX/scaleY，
//   node.x/y 是左上角绝对 px（Transformer 会移动它），
//   node.width/height 是原始尺寸，需乘以 scale 才是新尺寸。
//   → 清空 scale，将新尺寸固化到 width/height。
//
// CIRCLE（v-ellipse）：
//   node.x/y 是圆心绝对 px，
//   node.radiusX/Y 是原始半径，需乘以 scale。
//   → 清空 scale，将新半径固化到 radiusX/Y，
//   → store 存左上角 (x,y) + width/height。
// ─────────────────────────────────────────────
async function handleAnnotationTransformEnd(e: any, ann: AnnotationData) {
  const node   = e.target
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  node.scaleX(1)
  node.scaleY(1)

  let newX: number
  let newY: number
  let newWidth: number
  let newHeight: number

  if (ann.type === 'CIRCLE') {
    const newRx = node.radiusX() * scaleX
    const newRy = node.radiusY() * scaleY
    const newCx = px2mm(node.x())
    const newCy = px2mm(node.y())
    newWidth  = px2mm(newRx) * 2
    newHeight = px2mm(newRy) * 2
    newX      = newCx - newWidth  / 2
    newY      = newCy - newHeight / 2
    node.radiusX(newRx)
    node.radiusY(newRy)
    node.x(s(newX) + newRx)
    node.y(s(newY) + newRy)

  } else if (['TEXTBOX', 'STICKYNOTE'].includes(ann.type)) {
    newX      = px2mm(node.x())
    newY      = px2mm(node.y())
    newWidth  = (ann.width  ?? 60) * scaleX
    newHeight = (ann.height ?? 30) * scaleY

    // 固化：更新子节点的实际尺寸（bg rect 和 text）
    const bg   = node.findOne('Rect')
    const text = node.findOne('Text')
    if (bg) {
      bg.width(s(newWidth))
      bg.height(s(newHeight))
    }
    if (text) {
      text.width(s(newWidth)  - (ann.type === 'STICKYNOTE' ? 12 : 8))
      text.height(s(newHeight) - (ann.type === 'STICKYNOTE' ? 12 : 8))
    }

  } else {
    // RECTANGLE / STAMP
    newX      = px2mm(node.x())
    newY      = px2mm(node.y())
    newWidth  = px2mm(node.width()  * scaleX)
    newHeight = px2mm(node.height() * scaleY)
    node.width(s(newWidth))
    node.height(s(newHeight))
    node.x(s(newX))
    node.y(s(newY))
  }

  await store.updateAnnotation(ann.id, {
    x: newX, y: newY,
    width: newWidth, height: newHeight,
  })

  await nextTick()
  const transformer = annotationTransformerRef.value?.getNode()
  if (transformer) {
    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
  }
}

// ─────────────────────────────────────────────
// 提交注释
// ─────────────────────────────────────────────
async function commitAnnotation(
    tool: string,
    x: number, y: number,
    width: number, height: number,
) {
  const base: Partial<AnnotationData> = {
    type:        tool as any,
    pageIndex:   props.pageIndex,
    x, y, width, height,
    opacity:     store.annotationOpacity,
    color:       store.annotationColor,
    strokeColor: store.annotationColor,
    lineWidth:   store.annotationLineWidth,
  }

  switch (tool) {
    case 'HIGHLIGHT':
      base.strokeColor = 'transparent'
      break
    case 'UNDERLINE':
    case 'STRIKEOUT':
      base.height = 0
      break
    case 'SQUIGGLY': {
      const squigglyY = y + height
      base.y = squigglyY
      base.height = 0
      base.pathPoints = buildSquigglyRelativePoints(width, 0)
      break
    }
    case 'ARROW':
      // 保留真实起点和终点，避免把起点固定成包围盒左上角导致方向失真
      // x/y 仍使用包围盒左上角，pathPoints 存相对该锚点的两端点
      base.pathPoints = [
        [drawStartX.value - x, drawStartY.value - y],
        [drawCurX.value - x, drawCurY.value - y],
      ]
      break
    case 'FREEHAND':
      base.pathPoints = []
      for (let i = 0; i < drawingPoints.value.length; i += 2) {
        const ptX = px2mm(drawingPoints.value[i])
        const ptY = px2mm(drawingPoints.value[i + 1])
        base.pathPoints.push([ptX - x, ptY - y])
      }
      break
  }

  const result = await store.addAnnotation(base as any)
  if (result) {
    await refreshAnnotationLayer()
    ElMessage.success({ message: '注释已添加', duration: 1200, showClose: false })
  } else {
    ElMessage.error('注释保存失败，请检查后端连接')
  }
}

// ─────────────────────────────────────────────
// OFD 元素拖拽 / 变换
// ─────────────────────────────────────────────
async function handleDragEnd(e: any, elementId: string) {
  const element = props.page.elements.find(el => el.id === elementId)
  const node = e.target

  if (element?.type === 'PATH' && element.pathData) {
    if (element.pathLocalCoords) {
      store.updateElement(props.pageIndex, elementId, {
        x: px2mm(node.x()),
        y: px2mm(node.y()),
      })
    } else {
      const dx = px2mm(node.x())
      const dy = px2mm(node.y())
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
        store.updateElement(props.pageIndex, elementId, {
          x: element.x + dx,
          y: element.y + dy,
          pathData: translateSvgPath(element.pathData, dx, dy),
        })
      }
      node.x(0)
      node.y(0)
    }
  } else {
    store.updateElement(props.pageIndex, elementId, {
      x: px2mm(node.x()),
      y: px2mm(node.y()),
    })
  }
  await refreshElementTransformer(elementId)
}

async function handleTransformEnd(e: any, elementId: string) {
  const node = e.target
  const element = props.page.elements.find(el => el.id === elementId)

  if (element?.type === 'IMAGE') {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const newWidth  = px2mm(node.width() * Math.abs(scaleX))
    const newHeight = px2mm(node.height() * Math.abs(scaleY))
    node.scaleX(1)
    node.scaleY(1)
    store.updateElement(props.pageIndex, elementId, {
      x:        px2mm(node.x()),
      y:        px2mm(node.y()),
      width:    newWidth,
      height:   newHeight,
      scaleX:   1,
      scaleY:   1,
      rotation: node.rotation(),
    })
  } else if (element?.type === 'PATH' && element.pathLocalCoords && element.pathData) {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const absSx = Math.abs(scaleX)
    const absSy = Math.abs(scaleY)
    const newWidth = (element.width ?? 0) * absSx
    const newHeight = (element.height ?? 0) * absSy
    node.scaleX(1)
    node.scaleY(1)
    store.updateElement(props.pageIndex, elementId, {
      x:        px2mm(node.x()),
      y:        px2mm(node.y()),
      width:    newWidth,
      height:   newHeight,
      pathData: scaleLocalPath(element.pathData, absSx, absSy),
      scaleX:   1,
      scaleY:   1,
      rotation: node.rotation(),
    })
  } else if (element?.type === 'PATH') {
    const dx = px2mm(node.x())
    const dy = px2mm(node.y())
    node.x(0)
    node.y(0)
    node.scaleX(1)
    node.scaleY(1)
    store.updateElement(props.pageIndex, elementId, {
      x:        element.x + dx,
      y:        element.y + dy,
      pathData: element.pathData ? translateSvgPath(element.pathData, dx, dy) : element.pathData,
      scaleX:   1,
      scaleY:   1,
      rotation: node.rotation(),
    })
  } else {
    store.updateElement(props.pageIndex, elementId, {
      x:        px2mm(node.x()),
      y:        px2mm(node.y()),
      scaleX:   node.scaleX(),
      scaleY:   node.scaleY(),
      rotation: node.rotation(),
    })
  }
  await refreshElementTransformer(elementId)
}

// ─────────────────────────────────────────────
// OFD 元素 Config
// ─────────────────────────────────────────────
function getImageSrc(element: ElementData): string {
  const e = element as any
  if (typeof e.imageBase64 === 'string' && e.imageBase64.startsWith('data:')) return e.imageBase64
  if (typeof e.imageData  === 'string' && e.imageData.startsWith('data:'))   return e.imageData
  if (typeof e.imageUrl   === 'string' && e.imageUrl.trim())                  return e.imageUrl.trim()
  return ''
}

function getPathData(element: ElementData): string {
  const e = element as any
  return (typeof e.pathData === 'string' && e.pathData.trim()) ? e.pathData.trim() : ''
}

/**
 * 按字符大致猜测系统字体下的水平 advance（单位：em，即与 fontSize 同量纲）
 * OFD 原文常用嵌入字体的 Glyph 宽度排版；替换为系统字体后宽度会偏窄，因此需要估算
 * 自然渲染宽度，再用 letterSpacing 补差到 Boundary.w，避免片段间产生可见间隙。
 */
function approxAdvanceEm(ch: string): number {
  if (!ch || ch === '\n') return 0
  const code = ch.charCodeAt(0)
  // CJK 统一汉字 / 兼容汉字 / 全角符号 / 假名 / 谚文 → 全角字符
  if (
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xa000 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0x3000 && code <= 0x303f)
  ) return 1.0
  if (ch === ' ') return 0.32
  if (ch === '¥' || ch === '￥' || ch === '\u00a5' || ch === '\uffe5') return 0.72
  if (/[il.,;:'!|`]/.test(ch)) return 0.30
  if (/[A-Z0-9#&%@$]/.test(ch)) return 0.62
  return 0.55
}

function estimateNaturalWidthMm(text: string, fsMm: number): number {
  let sum = 0
  for (const ch of text) sum += approxAdvanceEm(ch)
  return sum * fsMm
}

function formatCurrencyDisplayText(text: string): string {
  return text.replace(/([¥￥])(?=\d)/g, '$1\u2002')
}

function normalizeCurrencyContent(raw: string): string {
  return raw.replace(/\s*\n\s*/g, '').trim()
}

function isCurrencySplitText(element: ElementData): boolean {
  if (element.verticalLayout || element.passwordGrid) return false
  const t = normalizeCurrencyContent(element.content ?? '')
  if (/^[¥￥][\d.,]+$/.test(t)) return true
  return /[¥￥][\d.,]+$/.test(t) && t.length <= 24
}

function getCurrencySplitParts(content: string): { prefix: string; symbol: string; tail: string } | null {
  const t = normalizeCurrencyContent(content)
  const m = t.match(/^(.*?)([¥￥])([\d.,]+)$/)
  if (m) return { prefix: m[1], symbol: m[2], tail: m[3] }
  return null
}

/** 数字段 x：前缀宽 + max(OFD 字距, Web ¥ 实际宽) */
function currencyTailOffsetPx(prefix: string, fsMm: number, glyphAdvanceMm?: number): number {
  const sc = MM_TO_PX * renderScale.value
  const prefixW = prefix ? estimateNaturalWidthMm(prefix, fsMm) * sc : 0
  const ofdGap = typeof glyphAdvanceMm === 'number' && glyphAdvanceMm > 0
      ? glyphAdvanceMm * sc : fsMm * sc * 0.55
  const yuanWeb = fsMm * sc * 0.82
  return prefixW + Math.max(ofdGap, yuanWeb) + fsMm * sc * 0.05
}

function buildTextFontStyle(element: ElementData, fsPx: number) {
  const fontStack = [element.fontFamily, 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', 'sans-serif']
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .join(', ')
  return {
    fontSize:   fsPx,
    fontFamily: fontStack,
    fontStyle:  `${element.bold ? 'bold' : 'normal'} ${element.italic ? 'italic' : ''}`.trim(),
    fill:       element.color ?? '#000000',
    wrap:       'none' as const,
    lineHeight: 1.15,
  }
}

function resolveTextFontPx(element: ElementData): number {
  const content = element.content ?? ''
  const hasNl   = content.includes('\n')
  const fsMm    = element.fontSize ?? 3
  const wMm     = element.width ?? 0
  const hMm     = element.height ?? 0
  const wPx     = wMm > 0 ? wMm * MM_TO_PX * renderScale.value : 0
  const hPx     = hMm > 0 ? hMm * MM_TO_PX * renderScale.value : 0
  const isVertical = element.verticalLayout === true || (hasNl && wMm > 0 && hMm > 0 && hMm > wMm * 1.5)
  let fsPx = fsMm * MM_TO_PX * renderScale.value
  const userOverride = element.fontSizeOverridden === true
  if (isVertical && !userOverride && wPx > 0) fsPx = Math.min(fsPx, wPx * 0.92)
  return fsPx
}

function getCurrencyGroupConfig(element: ElementData) {
  const isSelected = store.selectedElementId === element.id
  return {
    id:        element.id,
    x:         s(element.x),
    y:         s(element.y),
    rotation:  element.rotation ?? 0,
    draggable: elementDraggable(),
    listening: elementListens(),
    stroke:    isSelected ? '#1a73e8' : undefined,
    strokeWidth: isSelected ? 0.5 : 0,
  }
}

function getCurrencyHeadConfig(element: ElementData) {
  const parts = getCurrencySplitParts(element.content ?? '')
  const fsPx  = resolveTextFontPx(element)
  const isSelected = store.selectedElementId === element.id
  const headText = parts ? parts.prefix + parts.symbol : ''
  return {
    id:    `${element.id}-cur-h`,
    x:     0,
    y:     0,
    text:  headText,
    ...buildTextFontStyle(element, fsPx),
    letterSpacing: 0,
    align: 'left' as const,
    verticalAlign: 'top' as const,
    stroke: isSelected ? '#1a73e8' : undefined,
    strokeWidth: isSelected ? 0.5 : 0,
  }
}

function getCurrencyTailConfig(element: ElementData) {
  const parts = getCurrencySplitParts(element.content ?? '')
  const fsMm  = element.fontSize ?? 3
  const fsPx  = resolveTextFontPx(element)
  const isSelected = store.selectedElementId === element.id
  return {
    id:    `${element.id}-cur-t`,
    x:     parts ? currencyTailOffsetPx(parts.prefix, fsMm, element.glyphAdvanceMm) : 0,
    y:     0,
    text:  parts?.tail ?? '',
    ...buildTextFontStyle(element, fsPx),
    letterSpacing: 0,
    align: 'left' as const,
    verticalAlign: 'top' as const,
    stroke: isSelected ? '#1a73e8' : undefined,
    strokeWidth: isSelected ? 0.5 : 0,
  }
}

function getTextConfig(element: ElementData) {
  const isSelected = store.selectedElementId === element.id
  const content    = element.content ?? ''
  const hasNl      = content.includes('\n')
  const fsMm       = element.fontSize ?? 3
  const wMm        = element.width ?? 0
  const hMm        = element.height ?? 0
  const wPx = wMm > 0 ? wMm * MM_TO_PX * renderScale.value : 0
  const hPx = hMm > 0 ? hMm * MM_TO_PX * renderScale.value : 0
  // 后端竖排：content 已按字符拆为多行；用列宽做字号上限，避免被外接框高度撑爆
  const isVertical = element.verticalLayout === true || (hasNl && wMm > 0 && hMm > 0 && hMm > wMm * 1.5)
  const isPasswordGrid = element.passwordGrid === true
  const isMultiLineHorizontal = !isVertical && hasNl && wPx > 0 && !isPasswordGrid
  const paragraphStyle = !isVertical && !isPasswordGrid
  const textAlign = paragraphStyle ? normalizeTextAlign(element.textAlign) : (isVertical ? 'center' : 'left')

  let fsPx = fsMm * MM_TO_PX * renderScale.value
  // 用户在属性面板手动改过字号 → 绝对尊重用户输入，跳过任何按外接框尺寸的兜底裁剪
  const userOverride = element.fontSizeOverridden === true
  if (isVertical && !userOverride) {
    // 竖排：字号上限取列宽（避免溢出到隔壁列）
    if (wPx > 0) fsPx = Math.min(fsPx, wPx * 0.92)
  }

  // 字距：用户显式设置 letterSpacingMm 时优先；否则保留金额/标签拉伸逻辑
  let letterSpacing = 0
  const trimmed = content.trim()
  const isCurrencyAmount = /^[¥￥][\d.,]+$/.test(trimmed)
      || (/[¥￥][\d.,]+$/.test(trimmed) && trimmed.length <= 24)
  const isNumericOrAmount = /^[\d¥￥.,/%\-+\s()（）：:]*$/.test(trimmed)
  const isStretchLabel = !isVertical && !isPasswordGrid && !hasNl && !isMultiLineHorizontal && wMm > 0
      && content.length > 1 && content.length <= 8 && !isNumericOrAmount && !isCurrencyAmount
      && !content.includes('：') && !content.includes(':')
      && typeof element.letterSpacingMm !== 'number'

  if (paragraphStyle && typeof element.letterSpacingMm === 'number') {
    letterSpacing = element.letterSpacingMm * MM_TO_PX * renderScale.value
  } else if (isStretchLabel) {
    const fsMmRendered = fsPx / (MM_TO_PX * renderScale.value)
    const naturalMm    = estimateNaturalWidthMm(content, fsMmRendered)
    const gapMm        = wMm - naturalMm
    if (gapMm > 0.05 && gapMm < wMm * 0.35) {
      const lsMm = gapMm / (content.length - 1)
      letterSpacing = Math.min(lsMm, fsMmRendered * 0.6) * MM_TO_PX * renderScale.value
    }
  } else if (isCurrencyAmount && !isVertical && !isPasswordGrid && !hasNl) {
    const fsMmR = fsPx / (MM_TO_PX * renderScale.value)
    const ofdAdv = element.glyphAdvanceMm
    if (typeof ofdAdv === 'number' && ofdAdv > 0) {
      const lsMm = ofdAdv - fsMmR * 0.32
      if (lsMm > 0.02) letterSpacing = lsMm * MM_TO_PX * renderScale.value
    } else {
      letterSpacing = fsMm * 0.15 * MM_TO_PX * renderScale.value
    }
  }

  const displayText = isCurrencyAmount ? formatCurrencyDisplayText(content) : content

  const fontStack = [element.fontFamily, 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', 'sans-serif']
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .join(', ')

  const lineCount = hasNl ? content.split('\n').length : 1
  let lineHeight = hasNl ? (isVertical ? 1.05 : 1.12) : 1.15
  if (paragraphStyle && typeof element.lineSpacingMm === 'number' && element.lineSpacingMm > 0 && fsMm > 0) {
    lineHeight = lineHeightRatio(fsMm, element.lineSpacingMm)
  } else if (isPasswordGrid && lineCount > 1 && hMm > 0 && fsMm > 0) {
    /** 密码区：按外接框高度均分行距，避免底部溢出 */
    lineHeight = Math.min(1.12, Math.max(0.92, (hMm * 0.96) / (lineCount * fsMm)))
  }

  const baseCfg = {
    id:             element.id,
    x:              s(element.x),
    y:              s(element.y),
    rotation:       element.rotation ?? 0,
    draggable:      elementDraggable(),
    listening:      elementListens(),
    text:           displayText,
    fontSize:       fsPx,
    letterSpacing,
    lineHeight,
    fontFamily:     fontStack,
    fontStyle:      `${element.bold ? 'bold' : 'normal'} ${element.italic ? 'italic' : ''}`.trim(),
    align:          textAlign,
    verticalAlign:  (isVertical || isPasswordGrid) ? 'middle' : 'top',
    /** 后端已插入 \n 时不再 word-wrap，防止密码区等二次折行 */
    wrap:           'none' as const,
    ellipsis:       false,
    fill:           element.color    ?? '#000000',
    stroke:         isSelected ? '#1a73e8' : undefined,
    strokeWidth:    isSelected ? 0.5 : 0,
  }
  /** 竖排/密码区绑外接框尺寸以便 verticalAlign 居中；横排对齐需 width */
  if (isVertical && wPx > 0) return { ...baseCfg, width: wPx }
  if (isPasswordGrid && wPx > 0 && hPx > 0) return { ...baseCfg, width: wPx, height: hPx }
  if (paragraphStyle && wPx > 0) return { ...baseCfg, width: wPx }
  return baseCfg
}

function getPathConfig(element: ElementData) {
  const e          = element as any
  const isSelected = store.selectedElementId === element.id
  const sc         = MM_TO_PX * renderScale.value
  const local      = e.pathLocalCoords === true
  // OFD 矢量：纯填充/纯描边由 path*Enabled 与线宽控制；无描边时不得强制灰色描边
  const strokeOff  = e.pathStrokeEnabled === false
  const fillOff    = e.pathFillEnabled === false
  const lw         = (typeof e.lineWidth === 'number' && e.lineWidth > 0) ? e.lineWidth : 0
  const hasStrokeColor = isNotEmptyStr(e.strokeColor)
  const canStroke  = !strokeOff && (lw > 0 || hasStrokeColor)
  const strokeW    = isSelected
      ? 2 / sc
      : (strokeOff ? 0 : (lw > 0 ? lw : (hasStrokeColor ? 0.3 : 0)))
  const strokeCol  = isSelected
      ? '#1a73e8'
      : (strokeOff || (strokeW <= 0 && !isSelected) ? undefined : (e.strokeColor || '#222222'))
  const dash = dashPatternToKonva(e.dashPattern, sc)
  // strokeScaleEnabled:false 时 stroke/hit 线宽按「屏幕像素」计。
  // 只加大命中区，不改视觉线宽、不改 strokeScaleEnabled（避免保存后观感/坐标系异常）。
  const hitStrokePx = Math.max(16, (strokeW > 0 ? strokeW : 0) * sc)
  return {
    id:                 element.id,
    x:                  local ? s(element.x) : 0,
    y:                  local ? s(element.y) : 0,
    scaleX:             sc, scaleY: sc,
    rotation:           element.rotation ?? 0,
    draggable:          elementDraggable(),
    listening:          elementListens(),
    data:               getPathData(element),
    fill:               fillOff ? 'transparent' : (e.fillColor ?? 'transparent'),
    stroke:             strokeCol,
    strokeWidth:        strokeW,
    strokeScaleEnabled: false,
    hitStrokeWidth:     canStroke || isSelected || fillOff ? hitStrokePx : 0,
    dash,
    lineCap:            normalizeLineCap(e.lineCap),
    lineJoin:           normalizeLineJoin(e.lineJoin),
  }
}

function isNotEmptyStr(s: unknown) {
  return typeof s === 'string' && s.length > 0
}

function getSealConfig(element: ElementData) {
  return {
    id:        element.id,
    x:         s(element.x),
    y:         s(element.y),
    width:     s(element.width),
    height:    s(element.height),
    rotation:  element.rotation ?? 0,
    image:     imageMap[element.id],
    listening: false,
    draggable: false,
  }
}

function getSealPlaceholderConfig(element: ElementData) {
  return {
    id: element.id, x: s(element.x), y: s(element.y),
    width: s(element.width), height: s(element.height),
    fill: 'rgba(200,50,50,0.08)', stroke: 'rgba(200,50,50,0.25)',
    strokeWidth: 1, listening: false, draggable: false,
  }
}

function getImageConfig(element: ElementData) {
  const isSelected = store.selectedElementId === element.id
  return {
    id:          element.id,
    x:           s(element.x),
    y:           s(element.y),
    width:       s(element.width),
    height:      s(element.height),
    rotation:    element.rotation ?? 0,
    scaleX:      element.scaleX ?? 1,
    scaleY:      element.scaleY ?? 1,
    draggable:   elementDraggable(),
    listening:   elementListens(),
    image:       imageMap[element.id],
    stroke:      isSelected ? '#1a73e8' : undefined,
    strokeWidth: isSelected ? 1 : 0,
  }
}

function getImagePlaceholderConfig(element: ElementData) {
  return {
    id: element.id, x: s(element.x), y: s(element.y),
    width: s(element.width), height: s(element.height),
    fill: 'rgba(120,120,120,0.08)', stroke: 'rgba(120,120,120,0.35)',
    strokeWidth: 1, draggable: elementDraggable(), listening: elementListens(), listening: elementListens(),
  }
}

function getImageFailedConfig(element: ElementData) {
  return {
    id: element.id, x: s(element.x), y: s(element.y),
    width: s(element.width), height: s(element.height),
    fill: 'rgba(255,77,79,0.12)', stroke: '#ff4d4f',
    strokeWidth: 1, draggable: elementDraggable(), listening: elementListens(),
  }
}

function getImageNoSrcPlaceholderConfig(element: ElementData) {
  return {
    id: element.id, x: s(element.x), y: s(element.y),
    width: s(element.width), height: s(element.height),
    fill: 'rgba(255,0,0,0.05)', stroke: '#ffaaaa',
    strokeWidth: 1, draggable: elementDraggable(), listening: elementListens(),
  }
}

function getFallbackConfig(element: ElementData) {
  const isSelected = store.selectedElementId === element.id
  return {
    id: element.id, x: s(element.x), y: s(element.y),
    width: s(element.width), height: s(element.height),
    fill: 'transparent',
    stroke: isSelected ? '#1a73e8' : 'transparent',
    strokeWidth: isSelected ? 1 : 0,
    draggable: elementDraggable(),
    listening: elementListens(),
  }
}

// ─────────────────────────────────────────────
// 注释 Config
// ─────────────────────────────────────────────
function elementDraggable() { return store.isSelectTool && !props.offscreen }

/** 绘制类工具激活时，正文元素不拦截点击，便于在页内任意位置落点 */
function elementListens() {
  if (props.offscreen) return false
  if (store.isVectorTool || store.isTypewriterTool) return false
  return true
}

function annDraggable() { return store.currentTool === 'SELECT' && !props.offscreen }

function getAnnotationGroupConfig(ann: AnnotationData) {
  return {
    name:      ann.id,
    x:         s(ann.x),
    y:         s(ann.y),
    draggable: annDraggable(),
    listening: true,
  }
}

function getHighlightConfig(ann: AnnotationData) {
  return {
    name:        ann.id,
    x:           s(ann.x),
    y:           s(ann.y),
    width:       s(ann.width),
    height:      s(ann.height),
    fill:        ann.color   ?? '#000000',
    opacity:     ann.opacity ?? 0.45,
    stroke:      'transparent',
    strokeWidth: 0,
    listening:   true,
    draggable:   annDraggable(),
  }
}

function getRectangleConfig(ann: AnnotationData) {
  return {
    name:        ann.id,
    x:           s(ann.x),
    y:           s(ann.y),
    width:       s(ann.width),
    height:      s(ann.height),
    fill:        'transparent',
    stroke:      ann.strokeColor ?? ann.color ?? '#000000',
    strokeWidth: ann.lineWidth   ?? 2,
    opacity:     ann.opacity     ?? 1,
    listening:   true,
    draggable:   annDraggable(),
  }
}

function getLinkConfig(ann: AnnotationData) {
  const selected = store.selectedAnnotationId === ann.id
  return {
    name:        ann.id,
    x:           s(ann.x),
    y:           s(ann.y),
    width:       s(ann.width),
    height:      s(ann.height),
    fill:        'rgba(0, 120, 215, 0.12)',
    stroke:      selected ? '#005a9e' : (ann.strokeColor ?? '#0078d4'),
    strokeWidth: ann.lineWidth ?? 2,
    dash:        [6, 4],
    opacity:     ann.opacity ?? 0.85,
    listening:   true,
    draggable:   annDraggable(),
  }
}

// CIRCLE：store 存左上角(x,y) + width/height，渲染时换算圆心
function getCircleConfig(ann: AnnotationData) {
  const rx = s((ann.width  ?? 0) / 2)
  const ry = s((ann.height ?? 0) / 2)
  return {
    name:        ann.id,
    x:           s(ann.x) + rx,
    y:           s(ann.y) + ry,
    radiusX:     rx,
    radiusY:     ry,
    fill:        'transparent',
    stroke:      ann.strokeColor ?? ann.color ?? '#000000',
    strokeWidth: ann.lineWidth   ?? 2,
    opacity:     ann.opacity     ?? 1,
    listening:   true,
    draggable:   annDraggable(),
  }
}

// UNDERLINE / STRIKEOUT：节点自身 x/y 不设（默认0），points 存绝对 px
function getUnderlineConfig(ann: AnnotationData) {
  const baseY = s(ann.y + ann.height)
  return {
    name:        ann.id,
    points:      [s(ann.x), baseY, s(ann.x + ann.width), baseY],
    stroke:      ann.strokeColor ?? ann.color ?? '#000000',
    strokeWidth: ann.lineWidth   ?? 2,
    opacity:     ann.opacity     ?? 1,
    listening:   true,
    draggable:   annDraggable(),
  }
}

function getStrikeoutConfig(ann: AnnotationData) {
  const midY = s(ann.y + ann.height / 2)
  return {
    name:        ann.id,
    points:      [s(ann.x), midY, s(ann.x + ann.width), midY],
    stroke:      ann.strokeColor ?? ann.color ?? '#FF0000',
    strokeWidth: ann.lineWidth   ?? 2,
    opacity:     ann.opacity     ?? 1,
    listening:   true,
    draggable:   annDraggable(),
  }
}

function getSquigglyConfig(ann: AnnotationData) {
  const pts = ann.pathPoints ?? buildSquigglyRelativePoints(ann.width ?? 0, 0)
  return {
    name:        ann.id,
    points:      relativePointsToKonva(ann.x, ann.y, pts, s),
    stroke:      ann.strokeColor ?? ann.color ?? '#000000',
    strokeWidth: ann.lineWidth   ?? 2,
    lineCap:     'round' as const,
    lineJoin:    'round' as const,
    opacity:     ann.opacity     ?? 1,
    listening:   true,
    draggable:   annDraggable(),
  }
}

function replaceTextOffsetMm(ann: AnnotationData): number {
  return (ann.fontSize ?? 12) * 1.2 + 2
}

function getReplaceGroupConfig(ann: AnnotationData) {
  const offset = replaceTextOffsetMm(ann)
  return {
    name:      ann.id,
    x:         s(ann.x),
    y:         s(ann.y - offset),
    opacity:   ann.opacity ?? 1,
    listening: true,
    draggable: annDraggable(),
  }
}

function getReplaceTextConfig(ann: AnnotationData) {
  return {
    text:       ann.content ?? '',
    x:          0,
    y:          0,
    fontSize:   (ann.fontSize ?? 12) * MM_TO_PX * renderScale.value,
    fontFamily: 'Microsoft YaHei, sans-serif',
    fill:       ann.fontColor ?? '#2980b9',
    listening:  false,
  }
}

function getReplaceStrikeConfig(ann: AnnotationData) {
  const offset = s(replaceTextOffsetMm(ann))
  return {
    points:      [0, offset, s(ann.width), offset],
    stroke:      ann.strokeColor ?? ann.color ?? '#FF0000',
    strokeWidth: ann.lineWidth   ?? 2,
    listening:   false,
  }
}

function getReplaceCaretConfig(ann: AnnotationData) {
  const offset = s(replaceTextOffsetMm(ann))
  return {
    points:      [0, offset, s(2), offset - s(3), s(4), offset],
    stroke:      ann.strokeColor ?? ann.color ?? '#FF0000',
    strokeWidth: ann.lineWidth   ?? 2,
    lineCap:     'round' as const,
    lineJoin:    'round' as const,
    listening:   false,
  }
}

// ARROW：pathPoints 存相对于锚点(x,y) 的 mm 偏移，渲染时转绝对 px
function getArrowConfig(ann: AnnotationData) {
  const pts = ann.pathPoints ?? [[0, 0], [ann.width ?? 0, ann.height ?? 0]]
  const absPts: number[] = []
  for (const pt of pts) {
    absPts.push(s(ann.x + pt[0]))
    absPts.push(s(ann.y + pt[1]))
  }
  return {
    name:          ann.id,
    points:        absPts,
    stroke:        ann.strokeColor ?? ann.color ?? '#000000',
    strokeWidth:   ann.lineWidth   ?? 2,
    fill:          ann.strokeColor ?? ann.color ?? '#000000',
    opacity:       ann.opacity     ?? 1,
    pointerLength: 12,
    pointerWidth:  8,
    lineJoin:      'round' as const,
    listening:     true,
    draggable:     annDraggable(),
  }
}

// FREEHAND：pathPoints 存相对于锚点(x,y) 的 mm 偏移，渲染时转绝对 px
function getFreehandConfig(ann: AnnotationData) {
  const pts = ann.pathPoints ?? []
  const absPts: number[] = []
  for (const pt of pts) {
    absPts.push(s(ann.x + pt[0]))
    absPts.push(s(ann.y + pt[1]))
  }
  return {
    name:        ann.id,
    points:      absPts,
    stroke:      ann.strokeColor ?? ann.color ?? '#000000',
    strokeWidth: ann.lineWidth   ?? 2,
    lineCap:     'round' as const,
    lineJoin:    'round' as const,
    tension:     0.4,
    opacity:     ann.opacity ?? 1,
    listening:   true,
    draggable:   annDraggable(),
  }
}

function getTextBoxBgConfig(ann: AnnotationData) {
  return {
    x: 0, y: 0,
    width:        s(ann.width),
    height:       s(ann.height),
    fill:         ann.color       ?? '#FFFFFF',
    stroke:       ann.strokeColor ?? '#AAAAAA',
    strokeWidth:  ann.lineWidth   ?? 1,
    opacity:      ann.opacity     ?? 1,
    cornerRadius: 2,
    listening:    true,
  }
}

function getTextBoxTextConfig(ann: AnnotationData) {
  return {
    x: 4, y: 4,
    width:         s(ann.width)  - 8,
    height:        s(ann.height) - 8,
    text:          ann.content   ?? '',
    fontSize:      (ann.fontSize ?? 12) * MM_TO_PX * renderScale.value,
    fontFamily:    'Microsoft YaHei, sans-serif',
    fill:          ann.fontColor ?? '#000000',
    align:         'left'  as const,
    verticalAlign: 'top'   as const,
    wrap:          'word'  as const,
    listening:     true,
  }
}

function getStickyNoteBgConfig(ann: AnnotationData) {
  return {
    x: 0, y: 0,
    width:        s(ann.width),
    height:       s(ann.height),
    fill:         ann.color       ?? '#FFFACD',
    stroke:       ann.strokeColor ?? '#E6C619',
    strokeWidth:  ann.lineWidth   ?? 1,
    cornerRadius: 4,
    opacity:      ann.opacity     ?? 1,
    listening:    true,
  }
}

function getStickyNoteTextConfig(ann: AnnotationData) {
  return {
    x: 6, y: 6,
    width:         s(ann.width)  - 12,
    height:        s(ann.height) - 12,
    text:          ann.content   ?? '',
    fontSize:      (ann.fontSize ?? 12) * MM_TO_PX * renderScale.value,
    fontFamily:    'Microsoft YaHei, sans-serif',
    fill:          ann.fontColor ?? '#333333',
    align:         'left'  as const,
    verticalAlign: 'top'   as const,
    wrap:          'word'  as const,
    listening:     true,
  }
}

function getStampConfig(ann: AnnotationData) {
  return {
    name:      ann.id,
    image:     stampImageMap[ann.id],
    x:         s(ann.x),
    y:         s(ann.y),
    width:     s(ann.width),
    height:    s(ann.height),
    opacity:   ann.opacity ?? 1,
    listening: true,
    draggable: annDraggable(),
  }
}

// ─────────────────────────────────────────────
// 打印：把当前页渲染成高分辨率 PNG，供打印预览使用
// ─────────────────────────────────────────────
/** 当前页所需的位图（OFD 图像 + 图章）是否都已加载完成 */
function allImagesReady(): boolean {
  // 原生 PDF 非空白页需等待背景渲染完成（空白页无需背景）
  if (store.isPdfDocument && props.page.sourcePageIndex != null && !pdfBgCanvas.value) return false
  for (const el of props.page.elements) {
    if (el.type === 'IMAGE' || el.type === 'SEAL') {
      const src = getImageSrc(el)
      if (src && !imageMap[el.id] && !imageErrorMap[el.id]) return false
    }
  }
  for (const ann of pageAnnotations.value) {
    if (ann.type === 'STAMP' && ann.stampBase64 && !stampImageMap[ann.id]) return false
  }
  return true
}

/**
 * 把当前页导出为 PNG dataURL，供打印窗口使用。
 * @param pixelRatio        输出分辨率倍率（越大越清晰、越慢）
 * @param includeAnnotations 是否包含注释层
 */
async function captureForPrint(
    pixelRatio = 2,
    includeAnnotations = true,
): Promise<{ dataUrl: string; width: number; height: number }> {
  await nextTick()

  // 等待图片资源加载（最多 ~6s，超时则按现状渲染）
  const start = Date.now()
  while (!allImagesReady() && Date.now() - start < 6000) {
    await new Promise((r) => setTimeout(r, 80))
  }
  await nextTick()

  const stage:   any = stageRef.value?.getNode?.()
  const annLayer: any = annotationLayerRef.value?.getNode?.()
  const prevAnnVisible = annLayer?.visible?.() ?? true

  if (annLayer && !includeAnnotations) annLayer.visible(false)
  stage?.draw?.()

  let dataUrl = ''
  try {
    dataUrl = stage?.toDataURL?.({ pixelRatio, mimeType: 'image/png' }) ?? ''
  } catch (e) {
    console.warn('[print] 画布导出失败（可能存在跨域图片）', e)
    dataUrl = ''
  }

  if (annLayer && !includeAnnotations) {
    annLayer.visible(prevAnnVisible)
    stage?.draw?.()
  }

  const rotation = props.offscreen
      ? normalizeViewRotation(props.page.pageRotate ?? 0)
      : normalizeViewRotation((props.page.pageRotate ?? 0) + store.viewRotation)
  const eff = effectivePageSizeMm(props.page.width, props.page.height, rotation)

  return { dataUrl, width: eff.widthMm, height: eff.heightMm }
}

defineExpose({ captureForPrint })
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
}

.text-select-layer {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 5;
  overflow: hidden;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.text-select-span {
  position: absolute;
  white-space: pre;
  color: transparent;
  transform-origin: 0 0;
  pointer-events: auto;
}

.text-select-span::selection {
  background: rgba(26, 115, 232, 0.35);
}

.canvas-wrapper.cursor-hand {
  cursor: grab;
}

.canvas-wrapper.cursor-hand.cursor-grabbing {
  cursor: grabbing;
}

.canvas-wrapper.cursor-crosshair {
  cursor: crosshair;
}

.canvas-wrapper.cursor-direct {
  cursor: default;
}

.canvas-wrapper--offscreen {
  pointer-events: none;
}
</style>
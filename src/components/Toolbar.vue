<template>
  <div class="ribbon-shell">
    <!-- 隐藏文件输入 -->
    <input ref="ofdInputRef" type="file" accept=".ofd" style="display:none" @change="handleOfdUpload" />
    <input ref="pdfInputRef" type="file" accept=".pdf" style="display:none" @change="handlePdfImport" />
    <input ref="pdfToOfdInputRef" type="file" accept=".pdf" style="display:none" @change="handlePdfToOfdFile" />
    <input ref="pdfToWordInputRef" type="file" accept=".pdf" style="display:none" @change="handlePdfToWordFile" />
    <input ref="ofdToWordInputRef" type="file" accept=".ofd" style="display:none" @change="handleOfdToWordFile" />
    <input ref="pdfToPptInputRef" type="file" accept=".pdf" style="display:none" @change="handlePdfToPptFile" />
    <input ref="ofdToPptInputRef" type="file" accept=".ofd" style="display:none" @change="handleOfdToPptFile" />
    <input ref="ofdToTextInputRef" type="file" accept=".ofd" style="display:none" @change="handleOfdToTextFile" />
    <input ref="ofdToHtmlInputRef" type="file" accept=".ofd" style="display:none" @change="handleOfdToHtmlFile" />
    <input ref="imageInputRef" type="file" accept="image/*" style="display:none" @change="handleImageImport" />
    <input ref="stampInputRef" type="file" accept="image/*" style="display:none" @change="handleStampImageSelect" />

    <!-- 标签栏 -->
    <nav class="ribbon-tabs">
      <div class="ribbon-brand">
        <span class="brand-icon">OFD</span>
        <span class="brand-name">OFD Studio</span>
      </div>
      <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="ribbon-tab"
          :class="{ active: activeTab === tab.id, disabled: tab.disabled }"
          :disabled="tab.disabled"
          @click="switchTab(tab)"
      >
        {{ tab.label }}
      </button>
      <div class="ribbon-tabs-spacer" />
      <span v-if="store.document" class="ribbon-doc-title">
        {{ store.document.title }}<span v-if="store.hasUnsavedChanges" class="unsaved-mark"> *</span>
      </span>
      <el-dropdown trigger="click" placement="bottom-end" @command="handleAccountCommand">
        <button type="button" class="ribbon-account-btn" title="账号">
          <el-icon><User /></el-icon>
          <span class="account-name">{{ auth.displayLabel }}</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              {{ auth.isAdmin ? '管理员' : '普通用户' }} · {{ auth.user?.username }}
            </el-dropdown-item>
            <el-dropdown-item v-if="auth.isAdmin" command="users" :icon="UserFilled">
              用户管理
            </el-dropdown-item>
            <el-dropdown-item divided command="logout" :icon="SwitchButton">
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </nav>

    <!-- Ribbon 面板 -->
    <div class="ribbon-panel">
      <!-- ===== 文件 ===== -->
      <template v-if="activeTab === 'file'">
        <RibbonGroup label="打开">
          <RibbonButton label="新建空白" :icon="Document" tooltip="创建空白 OFD，可选参考网格（网格不写入文件）" @click="createBlankVisible = true" />
          <RibbonButton label="打开OFD" :icon="FolderOpened" @click="pickOpenOfd" />
          <RibbonButton label="导入PDF" :icon="Upload" @click="pickOpenPdf" />
          <el-dropdown trigger="click" placement="bottom-start" @command="handleRecentCommand">
            <span class="ribbon-dropdown-trigger">
              <RibbonButton label="最近打开" :icon="Clock" tooltip="快速打开最近 10 个文件" />
            </span>
            <template #dropdown>
              <el-dropdown-menu class="recent-files-menu">
                <el-dropdown-item v-if="recentFiles.length === 0" disabled>
                  暂无最近打开记录
                </el-dropdown-item>
                <el-dropdown-item
                    v-for="item in recentFiles"
                    :key="item.id"
                    :command="item.id"
                >
                  <div class="recent-item">
                    <span class="recent-kind" :class="item.kind">{{ item.kind.toUpperCase() }}</span>
                    <span class="recent-name" :title="item.pathHint">{{ item.name }}</span>
                    <span class="recent-time">{{ formatRecentTime(item.openedAt) }}</span>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item v-if="recentFiles.length > 0" divided command="__clear__">
                  清空最近列表
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="保存">
          <RibbonButton label="保存OFD" :icon="DocumentChecked" :disabled="!store.document" @click="handleSaveOfd" />
          <RibbonButton label="导出PDF" :icon="Download" :disabled="!store.document" @click="openExportPdfDialog" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="输出">
          <RibbonButton label="打印" :icon="Printer" :disabled="!store.document" @click="store.printDialogVisible = true" />
          <RibbonButton label="另存为" :icon="CopyDocument" :disabled="!store.document" @click="handleSaveAs" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="文档">
          <RibbonButton label="文档属性" :icon="InfoFilled" :disabled="!store.document" @click="showDocumentProperties" />
        </RibbonGroup>
      </template>

      <!-- ===== 主页 ===== -->
      <template v-else-if="activeTab === 'home'">
        <RibbonGroup label="工具">
          <RibbonButton label="手型" :icon="HandIcon" :active="store.currentTool === 'HAND'" @click="store.setTool('HAND')" />
          <RibbonButton label="选择" :icon="Rank" :active="store.currentTool === 'SELECT'" @click="store.setTool('SELECT')" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="编辑">
          <RibbonButton label="撤销" :icon="RefreshLeft" :disabled="!store.canUndo" @click="store.undo()" />
          <RibbonButton label="重做" :icon="RefreshRight" :disabled="!store.canRedo" @click="store.redo()" />
          <RibbonButton label="重置元素" :icon="RefreshLeft" :disabled="!store.selectedElement?.isDirty" @click="handleResetElement" />
          <RibbonButton
              label="复制"
              :icon="DocumentCopy"
              :disabled="!store.canCopySelectedElements"
              tooltip="复制选中元素（Ctrl+C）。编组/多选会一起复制"
              @click="onCopyElements"
          />
          <RibbonButton
              label="粘贴"
              :icon="DocumentChecked"
              :disabled="!store.canPasteElements"
              tooltip="粘贴到当前页（Ctrl+V），自动偏移以免重叠"
              @click="onPasteElements"
          />
          <RibbonButton label="删除元素" :icon="Delete" :disabled="!store.canDeleteSelectedElement" @click="handleDeleteElement" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="缩放">
          <RibbonButton label="缩小" :icon="ZoomOut" @click="store.setScale(store.scale - 0.25)" />
          <button type="button" class="ribbon-scale-display" @click="store.setScale(1)">
            {{ Math.round(store.scale * 100) }}%
          </button>
          <RibbonButton label="放大" :icon="ZoomIn" @click="store.setScale(store.scale + 0.25)" />
          <RibbonButton label="实际大小" :icon="FullScreen" @click="store.setScale(1)" />
          <RibbonButton label="适应宽度" :icon="Expand" :disabled="!store.document" @click="handleFitWidth" />
          <RibbonButton label="适应页面" :icon="Crop" :disabled="!store.document" @click="handleFitPage" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="页面">
          <RibbonButton label="插入页面" :icon="Plus" :disabled="!store.document" @click="handleInsertPage" />
          <RibbonButton label="复制页面" :icon="CopyDocument" :disabled="!store.document" @click="handleCopyPage" />
          <RibbonButton label="删除页面" :icon="Delete" :disabled="!store.document || (store.document?.pageCount ?? 0) <= 1" @click="handleDeletePage" />
        </RibbonGroup>
      </template>

      <!-- ===== 注释 ===== -->
      <template v-else-if="activeTab === 'comment'">
        <RibbonGroup label="模式">
          <RibbonButton label="选择" :icon="Pointer" :active="store.currentTool === 'SELECT'" @click="store.setTool('SELECT')" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="文字标注">
          <RibbonButton label="高亮" :active="store.currentTool === 'HIGHLIGHT'" @click="store.setTool('HIGHLIGHT')">
            <template #icon><span class="mark-icon highlight">A</span></template>
          </RibbonButton>
          <RibbonButton label="下划线" :active="store.currentTool === 'UNDERLINE'" @click="store.setTool('UNDERLINE')">
            <template #icon><span class="mark-icon underline">U</span></template>
          </RibbonButton>
          <RibbonButton label="波浪线" :active="store.currentTool === 'SQUIGGLY'" @click="store.setTool('SQUIGGLY')">
            <template #icon><span class="mark-icon squiggly">U</span></template>
          </RibbonButton>
          <RibbonButton label="删除线" :active="store.currentTool === 'STRIKEOUT'" @click="store.setTool('STRIKEOUT')">
            <template #icon><span class="mark-icon strike">S</span></template>
          </RibbonButton>
          <RibbonButton label="替换线" :active="store.currentTool === 'REPLACE'" @click="store.setTool('REPLACE')">
            <template #icon><span class="mark-icon replace">R</span></template>
          </RibbonButton>
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="图形">
          <RibbonButton label="矩形" :icon="ScaleToOriginal" :active="store.currentTool === 'RECTANGLE'" @click="store.setTool('RECTANGLE')" />
          <RibbonButton label="椭圆" :active="store.currentTool === 'CIRCLE'" @click="store.setTool('CIRCLE')">
            <template #icon><span class="shape-icon oval">○</span></template>
          </RibbonButton>
          <RibbonButton label="箭头" :icon="Right" :active="store.currentTool === 'ARROW'" @click="store.setTool('ARROW')" />
          <RibbonButton label="手绘" :icon="EditPen" :active="store.currentTool === 'FREEHAND'" @click="store.setTool('FREEHAND')" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="文本">
          <RibbonButton label="文本框" :icon="ChatLineSquare" :active="store.currentTool === 'TEXTBOX'" @click="store.setTool('TEXTBOX')" />
          <RibbonButton label="便利贴" :icon="Memo" :active="store.currentTool === 'STICKYNOTE'" @click="store.setTool('STICKYNOTE')" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="链接">
          <RibbonButton
              label="链接"
              :icon="LinkIcon"
              :active="store.currentTool === 'LINK'"
              :disabled="!store.document"
              tooltip="绘制矩形热区，跳转到页或打开网址"
              @click="store.setTool('LINK')"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="图章">
          <RibbonButton
              label="图章库"
              :icon="Medal"
              :disabled="!store.document"
              @click="stampDialogVisible = true"
          />
          <RibbonButton
              label="导入图章/签名"
              :icon="Stamp"
              :active="store.currentTool === 'STAMP'"
              :disabled="!store.document"
              @click="stampInputRef?.click()"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="样式">
          <div class="ribbon-style-row">
            <span class="style-label">颜色</span>
            <el-color-picker v-model="annotationColor" size="small" :predefine="predefineColors" />
          </div>
          <div class="ribbon-style-row">
            <span class="style-label">线宽</span>
            <el-select v-model="annotationLineWidth" size="small" style="width:72px">
              <el-option :value="1" label="细" />
              <el-option :value="2" label="中" />
              <el-option :value="3" label="粗" />
              <el-option :value="5" label="特粗" />
            </el-select>
          </div>
          <div class="ribbon-style-row">
            <span class="style-label">透明</span>
            <el-select v-model="annotationOpacity" size="small" style="width:72px">
              <el-option :value="0.2" label="20%" />
              <el-option :value="0.4" label="40%" />
              <el-option :value="0.6" label="60%" />
              <el-option :value="0.8" label="80%" />
              <el-option :value="1.0" label="100%" />
            </el-select>
          </div>
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="管理">
          <RibbonButton label="删除注释" :icon="Delete" :disabled="!store.selectedAnnotationId" @click="handleDeleteAnnotation" />
          <RibbonButton
              label="注释列表"
              :icon="Memo"
              :disabled="!store.document"
              tooltip="打开右侧注释列表面板"
              @click="store.openAnnotationListPanel()"
          />
          <RibbonButton
              label="汇总报告"
              :icon="Files"
              :disabled="!store.document || store.annotationCount === 0"
              tooltip="生成注释汇总报告（可导出 HTML / CSV / 打印）"
              @click="annotationReportVisible = true"
          />
          <RibbonButton
              :label="store.hasHiddenAnnotations ? '全部显示' : '全部隐藏'"
              :icon="View"
              :disabled="!store.document || store.annotationCount === 0"
              :tooltip="store.hasHiddenAnnotations ? '显示全部批注' : '隐藏全部批注'"
              @click="handleToggleAllAnnotationsVisibility"
          />
        </RibbonGroup>
      </template>

      <!-- ===== 视图 ===== -->
      <template v-else-if="activeTab === 'view'">
        <RibbonGroup label="导航">
          <RibbonButton label="手型" :icon="HandIcon" :active="store.currentTool === 'HAND'" @click="store.setTool('HAND')" />
          <RibbonButton label="选择" :icon="Rank" :active="store.currentTool === 'SELECT'" @click="store.setTool('SELECT')" />
          <RibbonButton
              label="大纲"
              :icon="Menu"
              :disabled="!store.document"
              :active="store.leftPanelTab === 'outline'"
              tooltip="显示文档书签目录（左侧面板）"
              @click="store.showOutlinePanel()"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="查找">
          <RibbonButton label="全文搜索" :icon="Search" :disabled="!store.document" tooltip="搜索文档文本（Ctrl+F）" @click="store.openSearch()" />
          <RibbonButton
              label="文本选择"
              :icon="DocumentCopy"
              :disabled="!store.document"
              :active="store.textSelectMode"
              tooltip="开启后可在页面上选中并复制文本"
              @click="store.toggleTextSelectMode()"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="缩放">
          <RibbonButton label="放大" :icon="ZoomIn" @click="store.setScale(store.scale + 0.25)" />
          <RibbonButton label="缩小" :icon="ZoomOut" @click="store.setScale(store.scale - 0.25)" />
          <RibbonButton label="实际大小" :icon="FullScreen" @click="store.setScale(1)" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="页面适应">
          <RibbonButton label="适应宽度" :icon="Expand" :disabled="!store.document" @click="handleFitWidth" />
          <RibbonButton label="适应页面" :icon="Crop" :disabled="!store.document" @click="handleFitPage" />
          <RibbonButton
              label="单页"
              :icon="Document"
              :disabled="!store.document"
              :active="store.pageViewMode === 'single'"
              @click="store.setPageViewMode('single')"
          />
          <RibbonButton
              label="连续页"
              :icon="Reading"
              :disabled="!store.document"
              :active="store.pageViewMode === 'continuous'"
              @click="store.setPageViewMode('continuous')"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="参考线">
          <RibbonButton
              label="网格"
              :icon="Grid"
              :disabled="!store.document"
              :active="store.showReferenceGrid"
              tooltip="显示/隐藏参考网格（仅编辑器显示，不会写入 OFD）"
              @click="store.toggleReferenceGrid()"
          />
          <RibbonButton
              label="标尺"
              :icon="Crop"
              :disabled="!store.document"
              :active="store.showRulers"
              tooltip="显示标尺：从顶边拖出水平参考线，从左侧拖出垂直参考线；可拖动调整，拖出页面或双击删除"
              @click="store.toggleRulers()"
          />
          <RibbonButton
              label="显示线"
              :icon="View"
              :disabled="!store.document"
              :active="store.showGuides"
              tooltip="显示/隐藏已拖出的参考线"
              @click="store.toggleGuides()"
          />
          <RibbonButton
              label="锁定"
              :icon="Lock"
              :disabled="!store.document"
              :active="store.guidesLocked"
              tooltip="锁定参考线，禁止拖动与删除"
              @click="store.toggleGuidesLocked()"
          />
          <RibbonButton
              label="清除"
              :icon="Delete"
              :disabled="!store.document || !store.getPageGuides(store.currentPageIndex).length"
              tooltip="清除当前页全部参考线"
              @click="store.clearPageGuides()"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="旋转">
          <RibbonButton
              label="顺时针"
              :icon="RefreshRight"
              :disabled="!store.document"
              tooltip="视图顺时针旋转 90°"
              @click="store.rotateViewClockwise()"
          />
          <RibbonButton
              label="逆时针"
              :icon="RefreshLeft"
              :disabled="!store.document"
              tooltip="视图逆时针旋转 90°"
              @click="store.rotateViewCounterClockwise()"
          />
        </RibbonGroup>
      </template>

      <!-- ===== 页面（文档结构） ===== -->
      <template v-else-if="activeTab === 'page-edit'">
        <RibbonGroup label="对象">
          <RibbonButton label="选择" :icon="Pointer" :active="store.currentTool === 'SELECT'" @click="store.setTool('SELECT')" />
          <RibbonButton label="重置元素" :icon="RefreshLeft" :disabled="!store.selectedElement?.isDirty" @click="handleResetElement" />
          <RibbonButton label="删除元素" :icon="Delete" :disabled="!store.canDeleteSelectedElement" @click="handleDeleteElement" />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="页面结构">
          <RibbonButton label="插入页面" :icon="Plus" :disabled="!store.document" @click="handleInsertPage" />
          <RibbonButton label="删除页面" :icon="Delete" :disabled="!store.document || (store.document?.pageCount ?? 0) <= 1" @click="handleDeletePage" />
          <RibbonButton label="复制页面" :icon="CopyDocument" :disabled="!store.document" @click="handleCopyPage" />
          <RibbonButton label="重排页面" :icon="Sort" :disabled="!store.document" tooltip="拖动左侧缩略图调整顺序" @click="handleReorderHint" />
          <RibbonButton
              label="顺时针转页"
              :icon="RefreshRight"
              :disabled="!store.document"
              tooltip="持久旋转当前页 90°（保存/导出后生效）"
              @click="handleRotatePage(true)"
          />
          <RibbonButton
              label="逆时针转页"
              :icon="RefreshLeft"
              :disabled="!store.document"
              tooltip="持久旋转当前页 -90°"
              @click="handleRotatePage(false)"
          />
          <RibbonButton
              label="提取页面"
              :icon="Scissor"
              :disabled="!store.document"
              tooltip="按页码范围提取为新文件"
              @click="extractDialogVisible = true"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="水印">
          <RibbonButton
              label="文本水印"
              :icon="Stamp"
              :disabled="!store.document"
              :active="!!store.watermarkConfig"
              tooltip="设置全局文本水印，保存/导出时烘焙"
              @click="watermarkDialogVisible = true"
          />
        </RibbonGroup>
      </template>

      <!-- ===== 内容（正文层：模式常驻 + 子页签） ===== -->
      <template v-else-if="activeTab === 'content-edit'">
        <RibbonGroup label="模式">
          <RibbonButton label="选择" :icon="Pointer" :active="store.currentTool === 'SELECT'" @click="store.setTool('SELECT')" />
          <RibbonButton
              label="直接选择"
              :icon="Aim"
              :disabled="!store.document"
              :active="store.currentTool === 'DIRECT_SELECT'"
              tooltip="编辑 PATH 锚点/手柄：拖动改形、框选、Delete 删锚点、双击锚点切换角点/平滑/对称、Alt 拖柄打断平滑"
              @click="store.setTool('DIRECT_SELECT')"
          />
          <RibbonButton
              label="倾斜"
              :icon="SkewIcon"
              :disabled="!store.document"
              :active="store.currentTool === 'VECTOR_SKEW'"
              tooltip="倾斜：先点锚点定中心，再拖拽绕中心剪切（矩形→平行四边形）。Shift=仅水平，Alt=仅垂直"
              @click="store.setTool('VECTOR_SKEW')"
          />
        </RibbonGroup>
        <RibbonSep />
        <div class="ribbon-subtabs" role="tablist" aria-label="内容工具分组">
          <button
              v-for="sub in contentSubTabs"
              :key="sub.id"
              type="button"
              role="tab"
              class="ribbon-subtab"
              :class="{ active: contentSubTab === sub.id }"
              :aria-selected="contentSubTab === sub.id"
              :title="sub.tip"
              @click="contentSubTab = sub.id"
          >
            {{ sub.label }}
          </button>
        </div>
        <RibbonSep />

        <!-- 绘制：矢量形状 / 编组剪贴板 / 插入 -->
        <template v-if="contentSubTab === 'draw'">
          <RibbonGroup label="矢量">
            <RibbonButton
                label="钢笔"
                :icon="EditPen"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_PEN'"
                tooltip="钢笔：单击落角点；按住拖拽拉出贝塞尔控制柄；靠近起点闭合；Enter/双击结束；Esc 取消"
                @click="store.setTool('VECTOR_PEN')"
            />
            <RibbonButton
                label="直线"
                :icon="Right"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_LINE'"
                tooltip="在正文层绘制直线（保存写入 PathObject）"
                @click="store.setTool('VECTOR_LINE')"
            />
            <RibbonButton
                label="矩形"
                :icon="ScaleToOriginal"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_RECT'"
                tooltip="在正文层绘制矩形"
                @click="store.setTool('VECTOR_RECT')"
            />
            <RibbonButton
                label="椭圆"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_ELLIPSE'"
                tooltip="在正文层绘制椭圆"
                @click="store.setTool('VECTOR_ELLIPSE')"
            >
              <template #icon><span class="shape-icon oval">○</span></template>
            </RibbonButton>
            <RibbonButton
                label="正圆"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_CIRCLE'"
                tooltip="在正文层绘制正圆（拖拽时锁定宽高相等）"
                @click="store.setTool('VECTOR_CIRCLE')"
            >
              <template #icon><span class="shape-icon circle">●</span></template>
            </RibbonButton>
            <RibbonButton
                label="弧线"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_ARC'"
                tooltip="拖出半圆弧（两端点）；Alt 反转弧向；从橙点拖到另一端可反向拼成圆；可继续画半弧做太极"
                @click="store.setTool('VECTOR_ARC')"
            >
              <template #icon><span class="shape-icon arc">◠</span></template>
            </RibbonButton>
            <RibbonButton
                v-if="store.currentTool === 'VECTOR_ARC' && store.lastArcSession"
                label="合成圆"
                :disabled="!store.document"
                tooltip="将当前半圆弧合成为闭合正圆"
                @click="store.completeLastArcAsCircle()"
            >
              <template #icon><span class="shape-icon circle">◎</span></template>
            </RibbonButton>
            <RibbonButton
                label="折线"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_POLYLINE'"
                tooltip="点击加点，双击 / Enter / 右键结束"
                @click="store.setTool('VECTOR_POLYLINE')"
            >
              <template #icon><span class="shape-icon poly">⌇</span></template>
            </RibbonButton>
            <RibbonButton
                label="多边形"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_POLYGON'"
                tooltip="点击加点，双击 / Enter / 右键闭合"
                @click="store.setTool('VECTOR_POLYGON')"
            >
              <template #icon><span class="shape-icon poly">⬠</span></template>
            </RibbonButton>
            <RibbonButton
                label="正多边形"
                :disabled="!store.document"
                :active="store.currentTool === 'VECTOR_REGULAR_POLYGON'"
                tooltip="从中心拖出正多边形；↑↓ 或 [ ] 调边数；Shift 吸附旋转"
                @click="store.setTool('VECTOR_REGULAR_POLYGON')"
            >
              <template #icon><span class="shape-icon poly">⬡</span></template>
            </RibbonButton>
            <div
                v-if="store.currentTool === 'VECTOR_REGULAR_POLYGON'"
                class="ribbon-style-row"
            >
              <span class="style-label">边数</span>
              <el-input-number
                  :model-value="store.regularPolygonSides"
                  size="small"
                  :min="3"
                  :max="24"
                  :step="1"
                  :precision="0"
                  style="width:88px"
                  controls-position="right"
                  @change="(v: number | undefined) => v != null && store.setRegularPolygonSides(v)"
              />
            </div>
          </RibbonGroup>
          <RibbonSep />
          <RibbonGroup label="整理">
            <RibbonButton
                label="编组"
                :icon="Collection"
                :disabled="!store.canGroupSelected"
                tooltip="将多选的 PATH 编为一组（Ctrl+G）。选择工具点组内任意对象可选中整组"
                @click="onGroupSelected"
            />
            <RibbonButton
                label="解组"
                :icon="FolderRemove"
                :disabled="!store.canUngroupSelected"
                tooltip="取消当前编组（Ctrl+Shift+G）。双击组可进入隔离编辑单个子对象"
                @click="onUngroupSelected"
            />
            <RibbonButton
                label="复制"
                :icon="DocumentCopy"
                :disabled="!store.canCopySelectedElements"
                tooltip="复制选中元素（Ctrl+C）。整组/多选一并复制"
                @click="onCopyElements"
            />
            <RibbonButton
                label="粘贴"
                :icon="DocumentChecked"
                :disabled="!store.canPasteElements"
                tooltip="粘贴到当前页（Ctrl+V）"
                @click="onPasteElements"
            />
            <RibbonButton
                label="再制"
                :icon="CopyDocument"
                :disabled="!store.canCopySelectedElements"
                tooltip="复制并立即粘贴一份（Ctrl+D）"
                @click="onDuplicateElements"
            />
          </RibbonGroup>
          <RibbonSep />
          <RibbonGroup label="插入">
            <RibbonButton
                label="打字机"
                :icon="EditPen"
                :disabled="!store.document"
                :active="store.currentTool === 'TYPEWRITER'"
                tooltip="在页面点击位置插入正文文字（保存后写入 OFD Content 层）"
                @click="onPickTypewriter"
            />
            <RibbonButton label="导入图片" :icon="Picture" :disabled="!store.document" @click="imageInputRef?.click()" />
            <RibbonButton
                label="图片裁剪"
                :icon="Crop"
                :disabled="!store.canCropSelectedImage()"
                tooltip="裁剪当前选中的图片元素"
                @click="handleOpenImageCrop"
            />
          </RibbonGroup>
        </template>

        <!-- 路径：变换 / 变形 / 拓扑 -->
        <template v-else-if="contentSubTab === 'path'">
          <RibbonGroup label="变换">
            <RibbonButton
                label="左右镜像"
                :icon="Switch"
                :disabled="!store.canTransformSelectedPath"
                tooltip="选中 PATH：左右翻转（相对中心）"
                @click="onMirrorPath('vertical')"
            />
            <RibbonButton
                label="上下镜像"
                :icon="Sort"
                :disabled="!store.canTransformSelectedPath"
                tooltip="选中 PATH：上下翻转（相对中心）"
                @click="onMirrorPath('horizontal')"
            />
            <div class="ribbon-style-row">
              <span class="style-label">角度</span>
              <el-input-number
                  v-model="pathRotateAngleDeg"
                  size="small"
                  :min="-360"
                  :max="360"
                  :step="5"
                  :precision="1"
                  style="width:96px"
                  :disabled="!store.document"
                  controls-position="right"
              />
              <span class="style-label" style="margin-left:2px">°</span>
            </div>
            <div class="ribbon-style-row">
              <span class="style-label">缩放</span>
              <el-input-number
                  v-model="pathRotateCopyScalePercent"
                  size="small"
                  :min="5"
                  :max="2000"
                  :step="5"
                  :precision="0"
                  style="width:96px"
                  :disabled="!store.document"
                  controls-position="right"
              />
              <span class="style-label" style="margin-left:2px">%</span>
            </div>
            <div class="ribbon-style-row">
              <span class="style-label">份数</span>
              <el-input-number
                  v-model="pathRotateCopyCount"
                  size="small"
                  :min="1"
                  :max="36"
                  :step="1"
                  :precision="0"
                  style="width:96px"
                  :disabled="!store.document"
                  controls-position="right"
              />
            </div>
            <RibbonButton
                label="旋转"
                :icon="RefreshRight"
                :disabled="!store.canTransformSelectedPath"
                :tooltip="`绕路径中心逆时针旋转 ${pathRotateAngleDeg}°（写入几何，不复制）`"
                @click="onRotatePath(pathRotateAngleDeg, false)"
            />
            <RibbonButton
                label="反向旋转"
                :icon="RefreshLeft"
                :disabled="!store.canTransformSelectedPath"
                :tooltip="`绕路径中心顺时针旋转 ${Math.abs(pathRotateAngleDeg)}°`"
                @click="onRotatePath(-Math.abs(pathRotateAngleDeg), false)"
            />
            <RibbonButton
                label="旋转复制"
                :icon="CopyDocument"
                :disabled="!store.canTransformSelectedPath"
                :tooltip="`再制 ${pathRotateCopyCount} 份：第 i 份旋转 i×${pathRotateAngleDeg}°、缩放 ${(pathRotateCopyScalePercent / 100).toFixed(2)}^i`"
                @click="onRotateCopyPath"
            />
            <RibbonButton
                label="偏移路径"
                :icon="Rank"
                :disabled="!store.canTransformSelectedPath"
                tooltip="平行偏移路径（正=外扩，负=内缩；C 段会先折线化）"
                @click="onOffsetPath"
            />
            <RibbonButton
                label="简化路径"
                :icon="MagicStick"
                :disabled="!store.canTransformSelectedPath"
                tooltip="减少锚点（Douglas–Peucker）；含曲线时会折线近似"
                @click="onSimplifyPath"
            />
          </RibbonGroup>
          <RibbonSep />
          <RibbonGroup label="变形">
            <div class="ribbon-style-row">
              <span class="style-label">弯曲</span>
              <el-input-number
                  v-model="pathWarpBendPercent"
                  size="small"
                  :min="-100"
                  :max="100"
                  :step="5"
                  :precision="0"
                  style="width:96px"
                  :disabled="!store.document"
                  controls-position="right"
              />
              <span class="style-label" style="margin-left:2px">%</span>
            </div>
            <RibbonButton
                label="弧形封套"
                :icon="Sort"
                :disabled="!store.canTransformSelectedPath"
                tooltip="按弯曲度做正弦弧形封套（正=上拱）"
                @click="onWarpArc('arc')"
            />
            <RibbonButton
                label="拱形封套"
                :icon="Sort"
                :disabled="!store.canTransformSelectedPath"
                tooltip="更尖的拱形封套"
                @click="onWarpArc('arch')"
            />
            <RibbonButton
                label="自由变形"
                :icon="Rank"
                :disabled="!store.canTransformSelectedPath"
                :active="store.currentTool === 'VECTOR_FREE_DISTORT'"
                tooltip="拖紫色四角拉扯路径；松手提交。再点一次退出"
                @click="onToggleFreeDistort"
            />
            <RibbonButton
                label="轮廓化描边"
                :icon="MagicStick"
                :disabled="!store.canTransformSelectedPath"
                tooltip="把描边变成可填充闭合轮廓（按当前线宽）"
                @click="onOutlineStroke"
            />
          </RibbonGroup>
          <RibbonSep />
          <RibbonGroup label="路径">
            <RibbonButton
                label="闭合路径"
                :icon="CircleCheck"
                :disabled="!store.canTransformSelectedPath"
                tooltip="开放路径连回起点并闭合"
                @click="onClosePath"
            />
            <RibbonButton
                label="打开路径"
                :icon="CircleCheck"
                :disabled="!store.canTransformSelectedPath"
                tooltip="去掉闭合，变为开放路径"
                @click="onOpenPath"
            />
            <RibbonButton
                label="连接首尾"
                :icon="LinkIcon"
                :disabled="!store.canTransformSelectedPath"
                tooltip="连接开放路径首尾锚点并闭合（可先选中首尾两点）"
                @click="onJoinPathEnds"
            />
            <RibbonButton
                label="断开锚点"
                :icon="Scissor"
                :disabled="!store.canTransformSelectedPath"
                tooltip="直接选择下选中一个锚点：闭合则打开；开放则拆成两条 PATH"
                @click="onBreakPathAnchor"
            />
          </RibbonGroup>
        </template>

        <!-- 样式：描边 / 填充 / 打字机 -->
        <template v-else>
          <RibbonGroup label="描边">
            <div class="ribbon-style-row">
              <span class="style-label">颜色</span>
              <el-color-picker
                  v-model="vectorStrokeColor"
                  size="small"
                  :disabled="!store.document || !store.vectorStrokeEnabled"
                  :predefine="predefineColors"
              />
            </div>
            <div class="ribbon-style-row">
              <span class="style-label">线宽</span>
              <el-input-number
                  :model-value="Math.round(store.vectorLineWidth * 10) / 10"
                  size="small"
                  :min="0.1"
                  :max="10"
                  :step="0.1"
                  :precision="1"
                  style="width:88px"
                  :disabled="!store.document || !store.vectorStrokeEnabled"
                  @change="onVectorLineWidthChange"
              />
              <span class="style-label" style="margin-left:4px">mm</span>
            </div>
            <div class="ribbon-style-row">
              <span class="style-label">线型</span>
              <el-select
                  v-model="vectorDashPreset"
                  size="small"
                  style="width:100px"
                  :disabled="!store.document || !store.vectorStrokeEnabled"
              >
                <el-option
                    v-for="p in DASH_PRESETS"
                    :key="p.id"
                    :label="p.label"
                    :value="p.id"
                />
              </el-select>
            </div>
            <div class="ribbon-style-row typewriter-style-toggles">
              <el-checkbox
                  v-model="vectorStrokeEnabled"
                  :disabled="!store.document"
                  size="small"
              >
                启用描边
              </el-checkbox>
            </div>
          </RibbonGroup>
          <RibbonSep />
          <RibbonGroup label="填充">
            <div class="ribbon-style-row">
              <span class="style-label">颜色</span>
              <el-color-picker
                  v-model="vectorFillColor"
                  size="small"
                  :disabled="!store.document || !store.vectorFillEnabled"
                  :predefine="predefineColors"
              />
            </div>
            <div class="ribbon-style-row typewriter-style-toggles">
              <el-checkbox
                  v-model="vectorFillEnabled"
                  :disabled="!store.document"
                  size="small"
              >
                启用填充
              </el-checkbox>
            </div>
          </RibbonGroup>
          <RibbonSep />
          <RibbonGroup label="打字机">
            <div class="ribbon-style-row">
              <span class="style-label">字体</span>
              <el-select
                  v-model="typewriterFontFamily"
                  size="small"
                  style="width:108px"
                  :disabled="!store.document"
              >
                <el-option
                    v-for="opt in TYPEWRITER_FONT_OPTIONS"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                />
              </el-select>
            </div>
            <div class="ribbon-style-row">
              <span class="style-label">字号</span>
              <el-input-number
                  :model-value="Math.round(store.typewriterFontSizeMm * 10) / 10"
                  size="small"
                  :min="2"
                  :max="20"
                  :step="0.5"
                  :precision="1"
                  style="width:88px"
                  :disabled="!store.document"
                  @change="onTypewriterFontSizeChange"
              />
              <span class="style-label" style="margin-left:4px">mm</span>
            </div>
            <div class="ribbon-style-row">
              <span class="style-label">颜色</span>
              <el-color-picker
                  v-model="typewriterColor"
                  size="small"
                  :disabled="!store.document"
                  :predefine="predefineColors"
              />
            </div>
            <div class="ribbon-style-row typewriter-style-toggles">
              <el-button
                  size="small"
                  :type="store.typewriterBold ? 'primary' : 'default'"
                  :disabled="!store.document"
                  class="tw-style-btn tw-style-btn--bold"
                  @click="toggleTypewriterBold"
              >
                B
              </el-button>
              <el-button
                  size="small"
                  :type="store.typewriterItalic ? 'primary' : 'default'"
                  :disabled="!store.document"
                  class="tw-style-btn tw-style-btn--italic"
                  @click="toggleTypewriterItalic"
              >
                I
              </el-button>
            </div>
          </RibbonGroup>
        </template>
      </template>

      <!-- ===== 转换 ===== -->
      <template v-else-if="activeTab === 'convert'">
        <RibbonGroup label="OFD转换">
          <RibbonButton
              label="OFD转PDF"
              :icon="Download"
              :disabled="!store.document || store.isPdfDocument"
              tooltip="导出 PDF，可选是否包含批注"
              @click="openExportPdfDialog"
          />
          <RibbonButton
              label="OFD转Word"
              :icon="Reading"
              :disabled="store.isPdfDocument"
              tooltip="一键将 OFD 转为 Word（.docx）。已打开 OFD 时含当前编辑与批注；也可选择本地 OFD 文件"
              @click="handleOfdToWord"
          />
          <RibbonButton
              label="OFD转PPT"
              :icon="Monitor"
              :disabled="store.isPdfDocument"
              tooltip="一键将 OFD 转为 PowerPoint（.pptx）。流程：OFD→PDF→PPT；已打开 OFD 时含当前编辑与批注"
              @click="handleOfdToPpt"
          />
          <RibbonButton
              label="OFD转文本"
              :icon="DocumentCopy"
              :disabled="store.isPdfDocument"
              tooltip="提取 OFD 文字为纯文本（ofdrw TextExporter）。扫描件/路径字可能无法提取"
              @click="handleOfdToText"
          />
          <RibbonButton
              label="OFD转HTML"
              :icon="View"
              :disabled="store.isPdfDocument"
              tooltip="将 OFD 导出为 HTML 网页（ofdrw HTMLExporter，SVG 版式预览）"
              @click="handleOfdToHtml"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="PDF转换">
          <RibbonButton
              label="PDF转OFD"
              :icon="Upload"
              tooltip="上传 PDF 并转为 OFD（ofdrw 矢量转换）；日常编辑 PDF 请用「文件→导入PDF」"
              @click="pdfToOfdInputRef?.click()"
          />
          <RibbonButton
              label="PDF转Word"
              :icon="Document"
              tooltip="将 PDF 转为 Word（.docx）。已打开的原生 PDF 可直接转换当前文档（含批注）；OFD 请用「OFD转Word」"
              @click="handlePdfToWord"
          />
          <RibbonButton
              label="PDF转PPT"
              :icon="Monitor"
              tooltip="将 PDF 转为 PowerPoint（.pptx）。已打开的原生 PDF 可直接转换当前文档（含批注）；OFD 请用「OFD转PPT」"
              @click="handlePdfToPpt"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="合并拆分">
          <RibbonButton
              label="OFD合并"
              :icon="Files"
              tooltip="合并 2～10 个 OFD：按列表顺序拼接页面"
              @click="mergeDialogVisible = true"
          />
          <RibbonButton
              label="PDF合并"
              :icon="Files"
              tooltip="合并 2～10 个 PDF，下载后导入编辑器"
              @click="pdfMergeDialogVisible = true"
          />
          <RibbonButton
              label="OFD拆分"
              :icon="Scissor"
              :disabled="!canSplitOfd"
              tooltip="将当前打开的 OFD 按页码拆成两份并分别保存"
              @click="ofdSplitDialogVisible = true"
          />
          <RibbonButton
              label="PDF拆分"
              :icon="Scissor"
              tooltip="选择原生 PDF 文件，按页码拆成两份并分别保存"
              @click="pdfSplitDialogVisible = true"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="导出">
          <RibbonButton
              label="导出当前页"
              :icon="PictureFilled"
              :disabled="!store.document"
              tooltip="将当前页导出为 PNG（含批注，保留当前视图旋转）"
              @click="store.exportCurrentPageImage()"
          />
          <RibbonButton
              label="导出页面 PNG"
              :icon="PictureFilled"
              :disabled="!store.document"
              tooltip="导出当前页、全部页或自定义页码范围（多页打包 ZIP）"
              @click="exportPagesDialogVisible = true"
          />
        </RibbonGroup>
      </template>

      <!-- ===== 保护 ===== -->
      <template v-else-if="activeTab === 'protect'">
        <RibbonGroup label="电子签章">
          <RibbonButton
              label="国密签章"
              :icon="Medal"
              :disabled="!store.document || store.isPdfDocument"
              tooltip="为 OFD 加盖国密（GM/T 0099 SES v4）电子签章"
              @click="openSignDialog"
          />
          <RibbonButton
              label="验证签章"
              :icon="CircleCheck"
              :disabled="!store.document || store.isPdfDocument"
              tooltip="校验当前 OFD 的电子签章 / 数字签名"
              @click="handleVerifySignature"
          />
        </RibbonGroup>
        <RibbonSep />
        <RibbonGroup label="安全">
          <RibbonButton label="加密" :icon="Lock" disabled tooltip="即将推出" @click="comingSoon" />
          <RibbonButton label="权限设置" :icon="Key" disabled tooltip="即将推出" @click="comingSoon" />
        </RibbonGroup>
      </template>

      <!-- ===== 帮助 ===== -->
      <template v-else-if="activeTab === 'help'">
        <RibbonGroup label="帮助">
          <RibbonButton label="使用说明" :icon="QuestionFilled" @click="showHelp" />
          <RibbonButton label="快捷键" :icon="QuestionFilled" @click="store.openShortcutsDialog()" />
          <RibbonButton label="关于" :icon="InfoFilled" @click="showAbout" />
        </RibbonGroup>
      </template>

      <!-- 占位 / 未开放标签 -->
      <template v-else>
        <div class="ribbon-placeholder">
          <el-icon><Clock /></el-icon>
          <span>「{{ currentTabLabel }}」功能即将推出</span>
        </div>
      </template>
    </div>

    <DocumentPropertiesDialog v-model="docPropsVisible" />
    <OfdMergeDialog v-model="mergeDialogVisible" />
    <PdfMergeDialog v-model="pdfMergeDialogVisible" />
    <OfdSplitDialog v-model="ofdSplitDialogVisible" />
    <PdfSplitDialog v-model="pdfSplitDialogVisible" />
    <ImageCropDialog v-model="store.imageCropDialogVisible" />
    <SignSealDialog v-model="signDialogVisible" />
    <WatermarkDialog v-model="watermarkDialogVisible" />
    <ExportPagesDialog v-model="exportPagesDialogVisible" />
    <ExportPdfDialog v-model="store.exportPdfDialogVisible" />
    <ExtractPagesDialog v-model="extractDialogVisible" />
    <DefaultStampDialog v-model="stampDialogVisible" @picked="activeTab = 'comment'" />
    <AnnotationReportDialog v-model="annotationReportVisible" />
    <CreateBlankOfdDialog v-model="createBlankVisible" />
    <UserManageDialog v-model="userManageVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, h, defineComponent, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload, Download, RefreshLeft, RefreshRight,
  ZoomIn, ZoomOut, Plus, Delete, EditPen, Right,
  ScaleToOriginal, ChatLineSquare, Memo, Pointer,
  Printer, FolderOpened, DocumentChecked, CopyDocument,
  InfoFilled, Rank, FullScreen, View, Expand, Crop,
  Document, Reading, Sort, Picture, Files, PictureFilled, Monitor,
  Lock, Key, Stamp, Medal, QuestionFilled, Clock, Scissor,
  Search, DocumentCopy, CircleCheck, Link as LinkIcon, Menu, Aim, Grid,
  Collection, FolderRemove, User, UserFilled, SwitchButton, Switch, MagicStick,
} from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editorStore'
import { useAuthStore } from '@/stores/authStore'
import { TYPEWRITER_FONT_OPTIONS } from '@/utils/typewriterFonts'
import { DASH_PRESETS, dashPatternFromPresetId, dashPresetIdFromPattern } from '@/utils/pathStyle'
import { buildOfdBlobFromPdf, saveDocument } from '@/composables/useDocumentFileActions'
import { openOfdDocument, openPdfDocument } from '@/composables/useDocumentOpen'
import {
  ofdApi, downloadBlob,
  pickOfdSaveTarget, writeBlobToSaveTarget,
} from '@/api/ofdApi'
import {
  clearRecentFiles,
  formatRecentTime,
  loadRecentFiles,
  pickOfdWithHandle,
  pickPdfWithHandle,
  tryOpenRecentFile,
  type RecentFileEntry,
} from '@/utils/recentFiles'
import RibbonButton from '@/components/RibbonButton.vue'
import DocumentPropertiesDialog from '@/components/DocumentPropertiesDialog.vue'
import OfdMergeDialog from '@/components/OfdMergeDialog.vue'
import PdfMergeDialog from '@/components/PdfMergeDialog.vue'
import OfdSplitDialog from '@/components/OfdSplitDialog.vue'
import PdfSplitDialog from '@/components/PdfSplitDialog.vue'
import ImageCropDialog from '@/components/ImageCropDialog.vue'
import SignSealDialog from '@/components/SignSealDialog.vue'
import WatermarkDialog from '@/components/WatermarkDialog.vue'
import ExportPagesDialog from '@/components/ExportPagesDialog.vue'
import ExportPdfDialog from '@/components/ExportPdfDialog.vue'
import ExtractPagesDialog from '@/components/ExtractPagesDialog.vue'
import DefaultStampDialog from '@/components/DefaultStampDialog.vue'
import AnnotationReportDialog from '@/components/AnnotationReportDialog.vue'
import CreateBlankOfdDialog from '@/components/CreateBlankOfdDialog.vue'
import UserManageDialog from '@/components/UserManageDialog.vue'

const HandIcon = defineComponent({
  name: 'HandIcon',
  render() {
    return h('svg', {
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }, [
      h('path', { d: 'M18 11V6a2 2 0 0 0-4 0v5' }),
      h('path', { d: 'M14 10V4a2 2 0 0 0-4 0v6' }),
      h('path', { d: 'M10 10V5a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-5a2 2 0 0 0-4 0v2' }),
    ])
  },
})

/** 平行四边形：倾斜工具图标 */
const SkewIcon = defineComponent({
  name: 'SkewIcon',
  render() {
    return h('svg', {
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }, [
      h('path', { d: 'M7 6h10l4 12H11L7 6z' }),
      h('path', { d: 'M4 18h3', opacity: '0.55' }),
    ])
  },
})

const store = useEditorStore()
/** 变换区：旋转 / 旋转复制共用角度（度，逆时针为正） */
const pathRotateAngleDeg = ref(15)
/** 旋转复制：每步缩放百分比（100=不缩放） */
const pathRotateCopyScalePercent = ref(100)
/** 旋转复制份数 */
const pathRotateCopyCount = ref(1)
/** 弧形/拱形封套弯曲度（%） */
const pathWarpBendPercent = ref(35)
const auth = useAuthStore()
const userManageVisible = ref(false)
const ofdInputRef = ref<HTMLInputElement>()
const pdfInputRef = ref<HTMLInputElement>()
const pdfToOfdInputRef = ref<HTMLInputElement>()
const pdfToWordInputRef = ref<HTMLInputElement>()
const ofdToWordInputRef = ref<HTMLInputElement>()
const pdfToPptInputRef = ref<HTMLInputElement>()
const ofdToPptInputRef = ref<HTMLInputElement>()
const ofdToTextInputRef = ref<HTMLInputElement>()
const ofdToHtmlInputRef = ref<HTMLInputElement>()
const imageInputRef = ref<HTMLInputElement>()
const stampInputRef = ref<HTMLInputElement>()
const docPropsVisible = ref(false)
const createBlankVisible = ref(false)
const mergeDialogVisible = ref(false)
const pdfMergeDialogVisible = ref(false)
const ofdSplitDialogVisible = ref(false)
const pdfSplitDialogVisible = ref(false)
const signDialogVisible = ref(false)
const watermarkDialogVisible = ref(false)
const exportPagesDialogVisible = ref(false)
const extractDialogVisible = ref(false)
const stampDialogVisible = ref(false)
const recentFiles = ref<RecentFileEntry[]>(loadRecentFiles())

function refreshRecentFiles() {
  recentFiles.value = loadRecentFiles()
}

function handleAccountCommand(cmd: string) {
  if (cmd === 'users') {
    userManageVisible.value = true
    return
  }
  if (cmd === 'logout') {
    auth.logout()
    ElMessage.success('已退出登录')
  }
}

onMounted(refreshRecentFiles)
const annotationReportVisible = ref(false)
const activeTab = ref('home')
/** 内容页签内二级分组：绘制 / 路径 / 样式 */
type ContentSubTab = 'draw' | 'path' | 'style'
const contentSubTab = ref<ContentSubTab>('draw')
const contentSubTabs: { id: ContentSubTab; label: string; tip: string }[] = [
  { id: 'draw', label: '绘制', tip: '矢量形状、编组与插入' },
  { id: 'path', label: '路径', tip: '变换、变形与路径开闭' },
  { id: 'style', label: '样式', tip: '描边、填充与打字机样式' },
]

const canSplitOfd = computed(
    () => !!store.document && !!store.fileId && (store.document.pageCount ?? 0) > 1,
)

const tabs = [
  { id: 'file', label: '文件', disabled: false },
  { id: 'home', label: '主页', disabled: false },
  { id: 'comment', label: '注释', disabled: false },
  { id: 'view', label: '视图', disabled: false },
  { id: 'page-edit', label: '页面', disabled: false },
  { id: 'content-edit', label: '内容', disabled: false },
  { id: 'convert', label: '转换', disabled: false },
  { id: 'protect', label: '保护', disabled: false },
  { id: 'help', label: '帮助', disabled: false },
]

const currentTabLabel = computed(() => tabs.find(t => t.id === activeTab.value)?.label ?? '')

function switchTab(tab: typeof tabs[0]) {
  if (tab.disabled) {
    ElMessage.info(`「${tab.label}」功能即将推出`)
    return
  }
  activeTab.value = tab.id
}

function comingSoon() {
  ElMessage.info('该功能即将推出，敬请期待')
}

function openSignDialog() {
  if (!store.document) { ElMessage.warning('请先打开 OFD 文档'); return }
  if (store.isPdfDocument) { ElMessage.warning('国密签章仅支持 OFD 文档'); return }
  signDialogVisible.value = true
}

async function resolveSavedOfdFile(): Promise<File | null> {
  if (store.fileId && store.getDocumentForSave()) {
    const { blob: ofdBlob } = await ofdApi.saveOfd(store.getDocumentForSave()!)
    const ofdName = `${store.document?.title ?? 'export'}.ofd`
    return new File([ofdBlob], ofdName, { type: 'application/ofd' })
  }
  return store.currentFile
}

async function handleVerifySignature() {
  if (!store.document) { ElMessage.warning('请先打开 OFD 文档'); return }
  if (store.isPdfDocument) { ElMessage.warning('验签仅支持 OFD 文档'); return }
  store.setLoading(true, '正在保存并验签…')
  try {
    const ofdFile = await resolveSavedOfdFile()
    if (!ofdFile) {
      ElMessage.warning('未找到 OFD 文件，请重新打开后再验签')
      return
    }
    const result = await ofdApi.verifySignature(ofdFile)
    const icon = !result.signed ? 'info' : (result.valid ? 'success' : 'error')
    const detail = result.signed ? `\n\n签名个数：${result.count}` : ''
    await ElMessageBox.alert(result.message + detail, '验签结果', {
      type: icon as any,
      confirmButtonText: '知道了',
    })
  } catch (err: any) {
    ElMessage.error(err?.message ?? '验签失败')
  } finally {
    store.setLoading(false)
  }
}

async function handleToggleAllAnnotationsVisibility() {
  if (store.annotationCount === 0) {
    ElMessage.warning('当前没有批注')
    return
  }
  const showAll = store.hasHiddenAnnotations
  const count = await store.setAllAnnotationsHidden(!showAll)
  if (count === 0) {
    ElMessage.info(showAll ? '批注已全部显示' : '批注已全部隐藏')
    return
  }
  ElMessage.success(showAll ? `已显示 ${count} 条批注` : `已隐藏 ${count} 条批注`)
}

function handleOpenImageCrop() {
  if (!store.openImageCropDialog()) {
    ElMessage.warning('请先选中一张可编辑的图片元素')
  }
}

function handleFitWidth() {
  if (!store.fitToWidth()) {
    ElMessage.warning('无法适应宽度，请先打开文档')
  }
}

function handleFitPage() {
  if (!store.fitToPage()) {
    ElMessage.warning('无法适应页面，请先打开文档')
  }
}

function showDocumentProperties() {
  if (!store.document) {
    ElMessage.warning('请先打开文档')
    return
  }
  docPropsVisible.value = true
}

function showHelp() {
  ElMessageBox.alert(
      '1. 「文件」打开 OFD 或导入 PDF（Ctrl+O 打开 OFD）\n' +
      '2. 「主页」选择工具并编辑页面元素\n' +
      '3. Ctrl+Z 撤销、Ctrl+Y 或 Ctrl+Shift+Z 重做\n' +
      '4. Ctrl+S 保存、Ctrl+P 打印、Ctrl+F 搜索\n' +
      '5. Ctrl+±0 缩放，PageUp/PageDown 翻页，Esc 逐级退出\n' +
      '6. F1 或 ? 打开快捷键面板\n' +
      '7. Delete 删除选中注释或元素\n' +
      '8. 「编辑 → 插入」可导入图片到当前页\n' +
      '9. 「注释 → 图章库」选择内置图章，或「导入图章/签名」上传图片，再点击页面放置\n' +
      '10. 「注释 → 汇总报告」导出全部批注统计与明细（HTML / CSV / 打印）\n' +
      '11. 「注释」添加高亮、图形等批注\n' +
      '12. 「转换」OFD 转 PDF/Word/PPT/文本/HTML、PDF 转 OFD/Word/PPT；「文件 → 打印」输出纸质或 PDF',
      '快速上手',
      { confirmButtonText: '知道了' }
  )
}

function showAbout() {
  ElMessageBox.alert(
      'OFD Studio v1.0\n开放版式文档（OFD）编辑器\n\n支持：解析 · 编辑 · 批注 · PDF 双向转换 · OFD/PDF 转 Word/PPT/文本/HTML · 打印',
      '关于 OFD Studio',
      { confirmButtonText: '确定' }
  )
}

// Ribbon 子组件（轻量内联）
const RibbonGroup = defineComponent({
  name: 'RibbonGroup',
  props: { label: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('div', { class: 'ribbon-group' }, [
      h('div', { class: 'ribbon-group-items' }, slots.default?.()),
      h('span', { class: 'ribbon-group-label' }, props.label),
    ])
  },
})

const RibbonSep = defineComponent({
  name: 'RibbonSep',
  setup() {
    return () => h('div', { class: 'ribbon-sep' })
  },
})

const annotationColor = computed({
  get: () => store.annotationColor,
  set: (v: string) => store.setAnnotationColor(v),
})
const annotationLineWidth = computed({
  get: () => store.annotationLineWidth,
  set: (v: number) => store.setAnnotationLineWidth(v),
})
const annotationOpacity = computed({
  get: () => store.annotationOpacity,
  set: (v: number) => store.setAnnotationOpacity(v),
})
const typewriterColor = computed({
  get: () => store.typewriterColor,
  set: (v: string) => {
    store.setTypewriterColor(v)
    store.applyTypewriterStyleToSelectedText({ color: v })
  },
})
const typewriterFontFamily = computed({
  get: () => store.typewriterFontFamily,
  set: (v: string) => {
    store.setTypewriterFontFamily(v)
    store.applyTypewriterStyleToSelectedText({ fontFamily: v })
  },
})

function onTypewriterFontSizeChange(v: number | undefined) {
  if (v == null) return
  store.setTypewriterFontSizeMm(v)
  store.applyTypewriterStyleToSelectedText({ fontSize: v })
}

function toggleTypewriterBold() {
  const next = !store.typewriterBold
  store.setTypewriterBold(next)
  store.applyTypewriterStyleToSelectedText({ bold: next })
}

function toggleTypewriterItalic() {
  const next = !store.typewriterItalic
  store.setTypewriterItalic(next)
  store.applyTypewriterStyleToSelectedText({ italic: next })
}

const vectorStrokeColor = computed({
  get: () => store.vectorStrokeColor,
  set: (v: string) => {
    store.setVectorStrokeColor(v)
    store.applyVectorStyleToSelectedPath({ strokeColor: v, pathStrokeEnabled: true })
  },
})
const vectorFillColor = computed({
  get: () => store.vectorFillColor,
  set: (v: string) => {
    store.setVectorFillColor(v)
    store.applyVectorStyleToSelectedPath({ fillColor: v, pathFillEnabled: true })
  },
})
const vectorFillEnabled = computed({
  get: () => store.vectorFillEnabled,
  set: (v: boolean) => {
    store.setVectorFillEnabled(v)
    store.applyVectorStyleToSelectedPath({
      pathFillEnabled: v,
      fillColor: v ? store.vectorFillColor : undefined,
    })
  },
})
const vectorStrokeEnabled = computed({
  get: () => store.vectorStrokeEnabled,
  set: (v: boolean) => {
    store.setVectorStrokeEnabled(v)
    store.applyVectorStyleToSelectedPath({ pathStrokeEnabled: v })
  },
})
const vectorDashPreset = computed({
  get: () => dashPresetIdFromPattern(store.vectorDashPattern),
  set: (presetId: string) => {
    const pattern = dashPatternFromPresetId(presetId)
    store.setVectorDashPattern(pattern)
    store.applyVectorStyleToSelectedPath({
      dashPattern: pattern,
      pathStrokeEnabled: true,
    })
  },
})

function onVectorLineWidthChange(v: number | undefined) {
  if (v == null) return
  store.setVectorLineWidth(v)
  store.applyVectorStyleToSelectedPath({ lineWidth: v, pathStrokeEnabled: true })
}

function onGroupSelected() {
  if (store.groupSelectedElements()) {
    ElMessage.success({ message: '已编组：选择工具点任一成员可选中整组', duration: 1800, showClose: false })
  } else {
    ElMessage.warning('请先 Shift+点击 选中至少 2 个 PATH')
  }
}

function onUngroupSelected() {
  if (store.ungroupSelectedElements()) {
    ElMessage.success({ message: '已解组', duration: 1200, showClose: false })
  }
}

function onCopyElements() {
  const r = store.copySelectedElements()
  if (r.ok) {
    ElMessage.success({ message: `已复制 ${r.count} 个对象`, duration: 1200, showClose: false })
  } else {
    ElMessage.warning('请先选中要复制的元素')
  }
}

function onPasteElements() {
  const r = store.pasteClipboardElements()
  if (r.ok) {
    ElMessage.success({ message: `已粘贴 ${r.count} 个对象`, duration: 1200, showClose: false })
  } else {
    ElMessage.warning('剪贴板为空，请先复制')
  }
}

function onDuplicateElements() {
  const r = store.duplicateSelectedElements()
  if (r.ok) {
    ElMessage.success({ message: `已再制 ${r.count} 个对象`, duration: 1200, showClose: false })
  } else {
    ElMessage.warning('请先选中要再制的元素')
  }
}

function onMirrorPath(axis: 'horizontal' | 'vertical') {
  const r = store.mirrorSelectedPath(axis)
  if (r.ok) {
    ElMessage.success({ message: axis === 'vertical' ? '已左右镜像' : '已上下镜像', duration: 1000, showClose: false })
  } else {
    ElMessage.warning(r.message || '请先选中 PATH')
  }
}

function onRotatePath(angleDeg: number, copy: boolean) {
  if (!Number.isFinite(angleDeg) || Math.abs(angleDeg) < 1e-9) {
    ElMessage.warning('请先设置非零旋转角度')
    return
  }
  if (copy) {
    onRotateCopyPath()
    return
  }
  const r = store.rotateSelectedPathAroundCenter(angleDeg)
  if (r.ok) {
    ElMessage.success({
      message: `已旋转 ${angleDeg}°`,
      duration: 1000,
      showClose: false,
    })
  } else {
    ElMessage.warning(r.message || '请先选中 PATH')
  }
}

function onRotateCopyPath() {
  if (!store.canTransformSelectedPath) {
    ElMessage.warning('请先选中 PATH')
    return
  }
  const angle = pathRotateAngleDeg.value
  if (!Number.isFinite(angle) || Math.abs(angle) < 1e-9) {
    ElMessage.warning('请先设置非零旋转角度')
    return
  }
  const scale = pathRotateCopyScalePercent.value / 100
  const count = pathRotateCopyCount.value
  const r = store.rotateCopySelectedPath({ angleDeg: angle, scale, count })
  if (r.ok) {
    const scaleTip = Math.abs(scale - 1) < 1e-9 ? '' : `，缩放 ${pathRotateCopyScalePercent.value}%/步`
    ElMessage.success({
      message: `已旋转复制 ${r.count} 份（${angle}°/步${scaleTip}）`,
      duration: 1600,
      showClose: false,
    })
  } else {
    ElMessage.warning(r.message || '旋转复制失败')
  }
}

async function onOffsetPath() {
  if (!store.canTransformSelectedPath) {
    ElMessage.warning('请先选中 PATH')
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('偏移距离（mm，正=外扩，负=内缩）', '偏移路径', {
      confirmButtonText: '应用',
      cancelButtonText: '取消',
      inputValue: '1',
      inputPattern: /^-?\d+(\.\d+)?$/,
      inputErrorMessage: '请输入数字',
    })
    const r = store.offsetSelectedPath(Number(value))
    if (r.ok) ElMessage.success({ message: '已偏移路径', duration: 1000, showClose: false })
    else ElMessage.warning(r.message || '偏移失败')
  } catch {
    /* cancel */
  }
}

async function onSimplifyPath() {
  if (!store.canTransformSelectedPath) {
    ElMessage.warning('请先选中 PATH')
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('简化容差（mm，越大锚点越少）', '简化路径', {
      confirmButtonText: '应用',
      cancelButtonText: '取消',
      inputValue: '0.3',
      inputPattern: /^\d+(\.\d+)?$/,
      inputErrorMessage: '请输入正数',
    })
    const r = store.simplifySelectedPath(Number(value))
    if (r.ok) ElMessage.success({ message: '已简化路径', duration: 1000, showClose: false })
    else ElMessage.warning(r.message || '简化失败')
  } catch {
    /* cancel */
  }
}

function onWarpArc(style: 'arc' | 'arch') {
  const bend = pathWarpBendPercent.value / 100
  if (Math.abs(bend) < 1e-6) {
    ElMessage.warning('请先设置非零弯曲度')
    return
  }
  const r = store.warpSelectedPathArc(bend, style, true)
  if (r.ok) ElMessage.success({ message: style === 'arch' ? '已应用拱形封套' : '已应用弧形封套', duration: 1000, showClose: false })
  else ElMessage.warning(r.message || '请先选中 PATH')
}

function onToggleFreeDistort() {
  if (store.currentTool === 'VECTOR_FREE_DISTORT') {
    store.endFreeDistort()
    ElMessage.success({ message: '已退出自由变形', duration: 1000, showClose: false })
    return
  }
  if (!store.canTransformSelectedPath) {
    ElMessage.warning('请先选中 PATH')
    return
  }
  contentSubTab.value = 'path'
  store.setTool('VECTOR_FREE_DISTORT')
  if (store.currentTool === 'VECTOR_FREE_DISTORT') {
    ElMessage.success({ message: '拖动紫色四角进行自由变形', duration: 1600, showClose: false })
  } else {
    ElMessage.warning('无法进入自由变形')
  }
}

function onPickTypewriter() {
  contentSubTab.value = 'style'
  store.setTool('TYPEWRITER')
}

/** 进入内容相关工具时，自动切到对应子页签 */
watch(
  () => store.currentTool,
  (tool) => {
    if (activeTab.value !== 'content-edit') return
    if (tool === 'TYPEWRITER') contentSubTab.value = 'style'
    else if (tool === 'VECTOR_FREE_DISTORT') contentSubTab.value = 'path'
    else if (
      tool === 'VECTOR_PEN'
      || tool === 'VECTOR_LINE'
      || tool === 'VECTOR_RECT'
      || tool === 'VECTOR_ELLIPSE'
      || tool === 'VECTOR_CIRCLE'
      || tool === 'VECTOR_ARC'
      || tool === 'VECTOR_POLYLINE'
      || tool === 'VECTOR_POLYGON'
      || tool === 'VECTOR_REGULAR_POLYGON'
    ) {
      contentSubTab.value = 'draw'
    }
  },
)

function onOutlineStroke() {
  const r = store.outlineSelectedPathStroke()
  if (r.ok) ElMessage.success({ message: '已轮廓化描边', duration: 1000, showClose: false })
  else ElMessage.warning(r.message || '轮廓化失败')
}

function onClosePath() {
  const r = store.closeSelectedPath()
  if (r.ok) ElMessage.success({ message: '已闭合路径', duration: 1000, showClose: false })
  else ElMessage.warning(r.message || '路径可能已闭合')
}

function onOpenPath() {
  const r = store.openSelectedPath()
  if (r.ok) ElMessage.success({ message: '已打开路径', duration: 1000, showClose: false })
  else ElMessage.warning(r.message || '路径可能未闭合')
}

function onJoinPathEnds() {
  const r = store.joinSelectedPathEnds()
  if (r.ok) ElMessage.success({ message: '已连接首尾', duration: 1000, showClose: false })
  else ElMessage.warning(r.message || '连接失败')
}

function onBreakPathAnchor() {
  const r = store.breakSelectedPathAtAnchor()
  if (r.ok) ElMessage.success({ message: '已断开锚点', duration: 1000, showClose: false })
  else ElMessage.warning(r.message || '请先在直接选择下选中一个锚点')
}

const predefineColors = [
  '#FFFF00', '#FF6B6B', '#51CF66', '#339AF0',
  '#FF922B', '#CC5DE8', '#000000', '#FFFFFF',
]

async function handleDeleteAnnotation() {
  if (!store.selectedAnnotationId) return
  await store.deleteAnnotation(store.selectedAnnotationId)
  ElMessage.success('注释已删除')
}

async function pickOpenOfd() {
  const picked = await pickOfdWithHandle()
  if (picked) {
    await openOfdFromFile(picked.file, picked.handle)
    return
  }
  ofdInputRef.value?.click()
}

async function pickOpenPdf() {
  const picked = await pickPdfWithHandle()
  if (picked) {
    await openPdfFromFile(picked.file, picked.handle)
    return
  }
  pdfInputRef.value?.click()
}

async function openOfdFromFile(file: File, handle?: FileSystemFileHandle | null) {
  const ok = await openOfdDocument(file, handle)
  if (ok) refreshRecentFiles()
}

async function openPdfFromFile(file: File, handle?: FileSystemFileHandle | null) {
  const ok = await openPdfDocument(file, handle)
  if (ok) refreshRecentFiles()
}

async function handleRecentCommand(command: string) {
  if (command === '__clear__') {
    clearRecentFiles()
    refreshRecentFiles()
    ElMessage.success('已清空最近打开列表')
    return
  }

  const entry = recentFiles.value.find((item) => item.id === command)
  if (!entry) return

  const cached = await tryOpenRecentFile(entry)
  if (cached) {
    if (entry.kind === 'ofd') {
      await openOfdFromFile(cached.file, cached.handle)
    } else {
      await openPdfFromFile(cached.file, cached.handle)
    }
    return
  }

  ElMessage.info(`请重新选择文件：${entry.name}`)
  if (entry.kind === 'ofd') {
    ofdInputRef.value?.click()
  } else {
    pdfInputRef.value?.click()
  }
}

async function handleOfdUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await openOfdFromFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function handleStampImageSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!store.document) {
    ElMessage.warning('请先打开 OFD 文件')
    return
  }
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片格式的图章/签名文件')
    return
  }
  try {
    const dataUrl = await readFileAsDataUrl(file)
    store.setPendingStampImage(dataUrl)
    activeTab.value = 'comment'
    ElMessage.success('已选择图章/签名，请点击页面放置（可重复放置）')
  } catch (err: any) {
    ElMessage.error(err.message || '读取图章/签名失败')
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

async function handleImageImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!store.document) {
    ElMessage.warning('请先打开 OFD 文件')
    return
  }
  store.setLoading(true, '正在导入图片...')
  try {
    await store.importImageToPage(store.currentPageIndex, file)
    ElMessage.success('图片已添加到当前页')
  } catch (err: any) {
    ElMessage.error(err.message || '导入图片失败')
  } finally {
    store.setLoading(false)
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function handlePdfImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await openPdfFromFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function handlePdfToOfdFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.pdf$/i.test(file.name)) {
    ElMessage.warning('请选择 PDF 文件')
    return
  }
  store.setLoading(true, '正在转换为 OFD（矢量转换，页数较多时请耐心等待）...')
  try {
    const blob = await ofdApi.fromPdf(file)
    const base = (file.name || 'export').replace(/\.pdf$/i, '').trim() || 'export'
    downloadBlob(blob, `${base}.ofd`)
    ElMessage.success('OFD 已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'PDF 转 OFD 失败')
  } finally {
    store.setLoading(false)
  }
}

/** 原生 PDF：烘焙批注后，经 ofdrw PDFConverter 转为 OFD */
async function handleSaveOfd() {
  await saveDocument()
}

async function handleSaveAs() {
  if (!store.document) return

  const target = await pickOfdSaveTarget(store.document.title)
  if (!target) return

  store.setLoading(true, '正在生成 OFD 文件...')
  try {
    let blob: Blob
    let elementSync: import('@/api/ofdApi').ElementSyncItem[] = []
    if (store.isPdfDocument) {
      blob = await buildOfdBlobFromPdf()
    } else {
      const saved = await ofdApi.saveOfd(store.getDocumentForSave()!)
      blob = saved.blob
      elementSync = saved.elementSync
    }
    await writeBlobToSaveTarget(blob, target)
    store.markNewElementsPersisted(elementSync)
    store.markDocumentSaved()
    ElMessage.success(`已另存为：${target.filename}`)
  } catch (err: any) {
    ElMessage.error(err.message || '另存为失败')
  } finally {
    store.setLoading(false)
  }
}

function openExportPdfDialog() {
  if (!store.document) {
    ElMessage.warning('请先打开文件')
    return
  }
  store.exportPdfDialogVisible = true
}

function docxFilenameFromPdfName(name: string): string {
  const base = (name || 'export').replace(/\.pdf$/i, '').trim() || 'export'
  return `${base}.docx`
}

function docxFilenameFromOfdName(name: string): string {
  const base = (name || 'export').replace(/\.ofd$/i, '').trim() || 'export'
  return `${base}.docx`
}

async function convertOfdFileToWord(file: File) {
  store.setLoading(true, '正在转换为 Word（OFD→PDF→Word，请稍候）...')
  try {
    const blob = await ofdApi.ofdToWord(file)
    downloadBlob(blob, docxFilenameFromOfdName(file.name))
    ElMessage.success('Word 已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'OFD 转 Word 失败')
  } finally {
    store.setLoading(false)
  }
}

async function handleOfdToWord() {
  if (store.isPdfDocument) {
    ElMessage.warning('当前为 PDF 文档，请使用「PDF转Word」')
    return
  }
  if (store.document && !store.isPdfDocument) {
    if (store.fileId && store.getDocumentForSave()) {
      store.setLoading(true, '正在转换为 Word（OFD→PDF→Word，请稍候）...')
      try {
        const { blob: ofdBlob } = await ofdApi.saveOfd(store.getDocumentForSave()!)
        const ofdName = `${store.document.title ?? 'export'}.ofd`
        const ofdFile = new File([ofdBlob], ofdName, { type: 'application/ofd' })
        const blob = await ofdApi.ofdToWord(ofdFile)
        downloadBlob(blob, docxFilenameFromOfdName(ofdName))
        ElMessage.success('Word 已开始下载')
      } catch (err: any) {
        ElMessage.error(err.message || 'OFD 转 Word 失败')
      } finally {
        store.setLoading(false)
      }
      return
    }
    if (store.currentFile) {
      await convertOfdFileToWord(store.currentFile)
      return
    }
  }
  ofdToWordInputRef.value?.click()
}

async function handleOfdToWordFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.ofd$/i.test(file.name)) {
    ElMessage.warning('请选择 OFD 文件')
    return
  }
  await convertOfdFileToWord(file)
}

function pptxFilenameFromOfdName(name: string): string {
  const base = (name || 'export').replace(/\.ofd$/i, '').trim() || 'export'
  return `${base}.pptx`
}

function pptxFilenameFromPdfName(name: string): string {
  const base = (name || 'export').replace(/\.pdf$/i, '').trim() || 'export'
  return `${base}.pptx`
}

async function convertOfdFileToPpt(file: File) {
  store.setLoading(true, '正在转换为 PPT（OFD→PDF→PPT，请稍候）...')
  try {
    const blob = await ofdApi.ofdToPpt(file)
    downloadBlob(blob, pptxFilenameFromOfdName(file.name))
    ElMessage.success('PPT 已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'OFD 转 PPT 失败')
  } finally {
    store.setLoading(false)
  }
}

async function handleOfdToPpt() {
  if (store.isPdfDocument) {
    ElMessage.warning('当前为 PDF 文档，请使用「PDF转PPT」')
    return
  }
  if (store.document && !store.isPdfDocument) {
    if (store.fileId && store.getDocumentForSave()) {
      store.setLoading(true, '正在转换为 PPT（OFD→PDF→PPT，请稍候）...')
      try {
        const { blob: ofdBlob } = await ofdApi.saveOfd(store.getDocumentForSave()!)
        const ofdName = `${store.document.title ?? 'export'}.ofd`
        const ofdFile = new File([ofdBlob], ofdName, { type: 'application/ofd' })
        const blob = await ofdApi.ofdToPpt(ofdFile)
        downloadBlob(blob, pptxFilenameFromOfdName(ofdName))
        ElMessage.success('PPT 已开始下载')
      } catch (err: any) {
        ElMessage.error(err.message || 'OFD 转 PPT 失败')
      } finally {
        store.setLoading(false)
      }
      return
    }
    if (store.currentFile) {
      await convertOfdFileToPpt(store.currentFile)
      return
    }
  }
  ofdToPptInputRef.value?.click()
}

async function handleOfdToPptFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.ofd$/i.test(file.name)) {
    ElMessage.warning('请选择 OFD 文件')
    return
  }
  await convertOfdFileToPpt(file)
}

function txtFilenameFromOfdName(name: string): string {
  const base = (name || 'export').replace(/\.ofd$/i, '').trim() || 'export'
  return `${base}.txt`
}

function htmlFilenameFromOfdName(name: string): string {
  const base = (name || 'export').replace(/\.ofd$/i, '').trim() || 'export'
  return `${base}.html`
}

async function convertOfdFileToText(file: File) {
  store.setLoading(true, '正在提取文本（ofdrw TextExporter）...')
  try {
    const blob = await ofdApi.ofdToText(file)
    downloadBlob(blob, txtFilenameFromOfdName(file.name))
    ElMessage.success('文本文件已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'OFD 转文本失败')
  } finally {
    store.setLoading(false)
  }
}

async function convertOfdFileToHtml(file: File) {
  store.setLoading(true, '正在导出 HTML（ofdrw HTMLExporter）...')
  try {
    const blob = await ofdApi.ofdToHtml(file)
    downloadBlob(blob, htmlFilenameFromOfdName(file.name))
    ElMessage.success('HTML 文件已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'OFD 转 HTML 失败')
  } finally {
    store.setLoading(false)
  }
}

async function handleOfdToText() {
  if (store.isPdfDocument) {
    ElMessage.warning('当前为 PDF 文档，无法直接转 OFD 文本')
    return
  }
  if (store.document && !store.isPdfDocument) {
    if (store.fileId && store.getDocumentForSave()) {
      store.setLoading(true, '正在提取文本…')
      try {
        const { blob: ofdBlob } = await ofdApi.saveOfd(store.getDocumentForSave()!)
        const ofdName = `${store.document.title ?? 'export'}.ofd`
        const ofdFile = new File([ofdBlob], ofdName, { type: 'application/ofd' })
        const blob = await ofdApi.ofdToText(ofdFile)
        downloadBlob(blob, txtFilenameFromOfdName(ofdName))
        ElMessage.success('文本文件已开始下载')
      } catch (err: any) {
        ElMessage.error(err.message || 'OFD 转文本失败')
      } finally {
        store.setLoading(false)
      }
      return
    }
    if (store.currentFile) {
      await convertOfdFileToText(store.currentFile)
      return
    }
  }
  ofdToTextInputRef.value?.click()
}

async function handleOfdToHtml() {
  if (store.isPdfDocument) {
    ElMessage.warning('当前为 PDF 文档，无法直接转 OFD HTML')
    return
  }
  if (store.document && !store.isPdfDocument) {
    if (store.fileId && store.getDocumentForSave()) {
      store.setLoading(true, '正在导出 HTML…')
      try {
        const { blob: ofdBlob } = await ofdApi.saveOfd(store.getDocumentForSave()!)
        const ofdName = `${store.document.title ?? 'export'}.ofd`
        const ofdFile = new File([ofdBlob], ofdName, { type: 'application/ofd' })
        const blob = await ofdApi.ofdToHtml(ofdFile)
        downloadBlob(blob, htmlFilenameFromOfdName(ofdName))
        ElMessage.success('HTML 文件已开始下载')
      } catch (err: any) {
        ElMessage.error(err.message || 'OFD 转 HTML 失败')
      } finally {
        store.setLoading(false)
      }
      return
    }
    if (store.currentFile) {
      await convertOfdFileToHtml(store.currentFile)
      return
    }
  }
  ofdToHtmlInputRef.value?.click()
}

async function handleOfdToTextFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.ofd$/i.test(file.name)) {
    ElMessage.warning('请选择 OFD 文件')
    return
  }
  await convertOfdFileToText(file)
}

async function handleOfdToHtmlFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.ofd$/i.test(file.name)) {
    ElMessage.warning('请选择 OFD 文件')
    return
  }
  await convertOfdFileToHtml(file)
}

async function convertPdfFileToPpt(file: File) {
  store.setLoading(true, '正在转换为 PPT（请稍候）...')
  try {
    const blob = await ofdApi.pdfToPpt(file)
    downloadBlob(blob, pptxFilenameFromPdfName(file.name))
    ElMessage.success('PPT 已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'PDF 转 PPT 失败')
  } finally {
    store.setLoading(false)
  }
}

async function handlePdfToPpt() {
  if (store.isPdfDocument && store.fileId) {
    store.setLoading(true, '正在导出 PDF 并转换为 PPT…')
    try {
      const pdfBlob = await store.getAnnotatedPdfBlob()
      if (!pdfBlob) throw new Error('无法获取当前 PDF')
      const pdfName = `${store.document?.title ?? 'export'}.pdf`
      const file = new File([pdfBlob], pdfName, { type: 'application/pdf' })
      await convertPdfFileToPpt(file)
    } catch (err: any) {
      ElMessage.error(err.message || 'PDF 转 PPT 失败')
      store.setLoading(false)
    }
    return
  }
  pdfToPptInputRef.value?.click()
}

async function handlePdfToPptFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.pdf$/i.test(file.name)) {
    ElMessage.warning('请选择 PDF 文件')
    return
  }
  await convertPdfFileToPpt(file)
}

async function convertPdfFileToWord(file: File) {
  store.setLoading(true, '正在转换为 Word（pdf2docx，请稍候）...')
  try {
    const blob = await ofdApi.pdfToWord(file)
    downloadBlob(blob, docxFilenameFromPdfName(file.name))
    ElMessage.success('Word 已开始下载')
  } catch (err: any) {
    ElMessage.error(err.message || 'PDF 转 Word 失败')
  } finally {
    store.setLoading(false)
  }
}

async function handlePdfToWord() {
  if (store.isPdfDocument && store.fileId) {
    store.setLoading(true, '正在导出 PDF 并转换为 Word…')
    try {
      const pdfBlob = await store.getAnnotatedPdfBlob()
      if (!pdfBlob) throw new Error('无法获取当前 PDF')
      const pdfName = `${store.document?.title ?? 'export'}.pdf`
      const file = new File([pdfBlob], pdfName, { type: 'application/pdf' })
      await convertPdfFileToWord(file)
    } catch (err: any) {
      ElMessage.error(err.message || 'PDF 转 Word 失败')
      store.setLoading(false)
    }
    return
  }
  pdfToWordInputRef.value?.click()
}

async function handlePdfToWordFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/\.pdf$/i.test(file.name)) {
    ElMessage.warning('请选择 PDF 文件')
    return
  }
  await convertPdfFileToWord(file)
}

function handleResetElement() {
  if (!store.selectedElementId) return
  store.resetElement(store.currentPageIndex, store.selectedElementId)
  ElMessage.success('已重置到原始状态')
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

function handleInsertPage() {
  store.insertPage(store.currentPageIndex + 1)
  ElMessage.success(`已在第 ${store.currentPageIndex + 1} 页后插入空白页`)
}

async function handleCopyPage() {
  if (!store.document) return
  const src = store.currentPageIndex
  try {
    const newIndex = await store.copyPage(src)
    if (newIndex !== undefined) {
      ElMessage.success(`已复制第 ${src + 1} 页为第 ${newIndex + 1} 页`)
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '复制页面失败')
  }
}

function handleReorderHint() {
  ElMessage.info('请在左侧页面列表中拖动缩略图调整页面顺序')
}

function handleRotatePage(clockwise: boolean) {
  if (store.rotateCurrentPagePersist(clockwise)) {
    ElMessage.success(`第 ${store.currentPageIndex + 1} 页已旋转，保存或导出后生效`)
  }
}

async function handleDeletePage() {
  store.deletePage(store.currentPageIndex)
  ElMessage.success('页面已删除')
}
</script>

<style scoped>
.ribbon-shell {
  flex-shrink: 0;
  background: var(--ribbon-bg);
  border-bottom: 1px solid var(--line);
  z-index: 10;
}

/* ---- 标签栏 ---- */
.ribbon-tabs {
  display: flex;
  align-items: stretch;
  height: 36px;
  padding: 0 8px 0 0;
  background: var(--ribbon-tab-bar-bg);
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
}
.ribbon-tabs::-webkit-scrollbar { height: 4px; }

.ribbon-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 0 12px;
  margin-right: 4px;
  flex-shrink: 0;
}
.brand-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(145deg, var(--ribbon-accent), var(--ribbon-accent-dark));
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
.brand-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  white-space: nowrap;
}

.ribbon-tab {
  padding: 0 14px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-2);
  cursor: pointer;
  white-space: nowrap;
  border-radius: 4px 4px 0 0;
  margin-top: 4px;
  transition: background .12s, color .12s;
}
.ribbon-tab:hover:not(.disabled):not(.active) {
  background: rgba(0, 0, 0, .04);
  color: var(--text-1);
}
.ribbon-tab.active {
  background: var(--ribbon-accent);
  color: #fff;
  font-weight: 600;
}
.ribbon-tab.disabled {
  opacity: .45;
  cursor: not-allowed;
}

.ribbon-tabs-spacer { flex: 1; min-width: 12px; }
.ribbon-account-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 10px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #344054;
  font-size: 12px;
  cursor: pointer;
}
.ribbon-account-btn:hover {
  background: rgba(26, 115, 232, 0.08);
  border-color: rgba(26, 115, 232, 0.18);
}
.account-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ribbon-doc-title {
  align-self: center;
  max-width: 280px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unsaved-mark {
  color: #e6a23c;
  font-weight: 700;
}

/* ---- Ribbon 面板 ---- */
.ribbon-panel {
  display: flex;
  align-items: stretch;
  min-height: 88px;
  padding: 6px 12px 4px;
  overflow-x: auto;
  background: var(--ribbon-panel-bg);
}
.ribbon-panel::-webkit-scrollbar { height: 6px; }

:deep(.ribbon-group) {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 6px;
  flex-shrink: 0;
}
:deep(.ribbon-group-items) {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  flex: 1;
  padding-bottom: 2px;
}
:deep(.ribbon-group-label) {
  font-size: 10px;
  color: var(--text-3);
  text-align: center;
  padding: 2px 0 0;
  white-space: nowrap;
}

:deep(.ribbon-sep) {
  width: 1px;
  align-self: stretch;
  margin: 4px 6px;
  background: var(--line-strong);
  flex-shrink: 0;
}

.ribbon-subtabs {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 2px 4px 10px;
  flex-shrink: 0;
  align-self: center;
}
.ribbon-subtab {
  border: 1px solid transparent;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  padding: 6px 12px;
  border-radius: 6px;
  color: var(--text-2);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.ribbon-subtab:hover:not(.active) {
  background: #fff;
  border-color: var(--line);
  color: var(--text-1);
}
.ribbon-subtab.active {
  background: var(--ribbon-btn-active-bg);
  border-color: var(--ribbon-accent-soft);
  color: var(--ribbon-accent);
  font-weight: 600;
}

.ribbon-scale-display {
  min-width: 52px;
  height: 62px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  cursor: pointer;
  flex-shrink: 0;
}
.ribbon-scale-display:hover {
  border-color: var(--ribbon-accent);
  color: var(--ribbon-accent);
}

.ribbon-style-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  min-width: 72px;
}
.style-label { font-size: 10px; color: var(--text-3); }

.typewriter-style-toggles {
  gap: 4px;
}
.tw-style-btn {
  min-width: 28px;
  padding: 4px 8px;
}
.tw-style-btn--bold {
  font-weight: 700;
}
.tw-style-btn--italic {
  font-style: italic;
}

.mark-icon, .shape-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 3px;
}
.mark-icon.highlight { background: #ffe566; color: #333; }
.mark-icon.underline { color: var(--ribbon-accent); text-decoration: underline; }
.mark-icon.squiggly { color: var(--ribbon-accent); text-decoration: underline wavy; }
.mark-icon.strike { color: #e74c3c; text-decoration: line-through; }
.mark-icon.replace { color: #2980b9; text-decoration: line-through; font-style: italic; }
.shape-icon.oval,
.shape-icon.circle,
.shape-icon.arc { font-size: 18px; color: var(--text-2); }

.ribbon-placeholder {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 32px;
  color: var(--text-3);
  font-size: 14px;
}
.ribbon-placeholder .el-icon { font-size: 22px; }

.ribbon-dropdown-trigger {
  display: inline-flex;
}

:deep(.recent-files-menu) {
  min-width: 280px;
  max-width: 420px;
}

:deep(.recent-files-menu .recent-item) {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  max-width: 360px;
}

:deep(.recent-files-menu .recent-kind) {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  background: #d48806;
}

:deep(.recent-files-menu .recent-kind.pdf) {
  background: #c0392b;
}

:deep(.recent-files-menu .recent-name) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

:deep(.recent-files-menu .recent-time) {
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
}
</style>

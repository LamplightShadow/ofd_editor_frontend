<template>
  <el-dialog
      v-model="visible"
      title="用户管理"
      width="720px"
      :append-to-body="true"
      class="user-manage-dialog"
      @open="reload"
  >
    <div class="toolbar-row">
      <el-button type="primary" :icon="Plus" @click="showCreate = true">创建用户</el-button>
      <el-button :icon="Refresh" :loading="loading" @click="reload">刷新</el-button>
    </div>

    <el-table :data="users" size="small" stripe v-loading="loading" max-height="360">
      <el-table-column prop="id" label="ID" width="64" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="displayName" label="显示名" min-width="120" />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.role === 'ADMIN' ? 'danger' : 'info'">
            {{ row.role === 'ADMIN' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openReset(row)">重置密码</el-button>
          <el-button
              link
              :type="row.enabled ? 'warning' : 'success'"
              :disabled="row.id === auth.user?.id"
              @click="toggleEnabled(row)"
          >
            {{ row.enabled ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
        v-model="showCreate"
        title="创建用户"
        width="420px"
        append-to-body
        @closed="resetCreateForm"
    >
      <el-form label-width="80px" @submit.prevent>
        <el-form-item label="用户名" required>
          <el-input v-model="createForm.username" maxlength="64" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="createForm.displayName" maxlength="64" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" type="password" show-password maxlength="128" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="createForm.role" style="width: 100%">
            <el-option label="普通用户" value="USER" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog
        v-model="showReset"
        title="重置密码"
        width="400px"
        append-to-body
    >
      <p class="reset-tip">为用户 <strong>{{ resetTarget?.username }}</strong> 设置新密码</p>
      <el-input v-model="resetPassword" type="password" show-password placeholder="新密码（至少 4 位）" />
      <template #footer>
        <el-button @click="showReset = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitReset">确认</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'
import type { UserInfo, UserRole } from '@/types/auth'

const visible = defineModel<boolean>({ default: false })
const auth = useAuthStore()

const users = ref<UserInfo[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)
const showReset = ref(false)
const resetTarget = ref<UserInfo | null>(null)
const resetPassword = ref('')

const createForm = reactive({
  username: '',
  displayName: '',
  password: '',
  role: 'USER' as UserRole,
})

function resetCreateForm() {
  createForm.username = ''
  createForm.displayName = ''
  createForm.password = ''
  createForm.role = 'USER'
}

async function reload() {
  loading.value = true
  try {
    users.value = await auth.listUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  if (!createForm.username.trim() || createForm.password.length < 4) {
    ElMessage.warning('请填写用户名，密码至少 4 位')
    return
  }
  saving.value = true
  try {
    await auth.createUser({
      username: createForm.username.trim(),
      password: createForm.password,
      displayName: createForm.displayName.trim() || undefined,
      role: createForm.role,
    })
    ElMessage.success('用户已创建')
    showCreate.value = false
    await reload()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    saving.value = false
  }
}

function openReset(row: UserInfo) {
  resetTarget.value = row
  resetPassword.value = ''
  showReset.value = true
}

async function submitReset() {
  if (!resetTarget.value || resetPassword.value.length < 4) {
    ElMessage.warning('密码至少 4 位')
    return
  }
  saving.value = true
  try {
    await auth.resetUserPassword(resetTarget.value.id, resetPassword.value)
    ElMessage.success('密码已重置')
    showReset.value = false
  } catch (e: any) {
    ElMessage.error(e?.message || '重置失败')
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(row: UserInfo) {
  const next = !row.enabled
  try {
    await ElMessageBox.confirm(
        next ? `确定启用用户「${row.username}」？` : `确定停用用户「${row.username}」？`,
        '确认',
        { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await auth.setUserEnabled(row.id, next)
    ElMessage.success(next ? '已启用' : '已停用')
    await reload()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}
</script>

<style scoped>
.toolbar-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.reset-tip {
  margin: 0 0 12px;
  color: #475467;
  font-size: 14px;
}
</style>

<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true" />
    <form class="login-card" @submit.prevent="onSubmit">
      <div class="login-brand">OFD</div>
      <h1 class="login-title">OFD Studio</h1>
      <p class="login-sub">请使用管理员分配的账号登录</p>

      <label class="field">
        <span>用户名</span>
        <el-input
            v-model="username"
            size="large"
            autocomplete="username"
            placeholder="用户名"
            :disabled="loading"
        />
      </label>

      <label class="field">
        <span>密码</span>
        <el-input
            v-model="password"
            size="large"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="密码"
            :disabled="loading"
            @keyup.enter="onSubmit"
        />
      </label>

      <el-button
          class="login-btn"
          type="primary"
          size="large"
          native-type="submit"
          :loading="loading"
          :disabled="!username.trim() || !password"
      >
        登录
      </el-button>

      <p class="login-hint">默认管理员：admin / admin（首次启动自动创建）</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
const username = ref('admin')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!username.value.trim() || !password.value) return
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    ElMessage.success('登录成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  background: #0f1419;
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
      radial-gradient(ellipse 80% 60% at 20% 20%, rgba(26, 115, 232, 0.28), transparent 55%),
      radial-gradient(ellipse 70% 50% at 80% 80%, rgba(20, 160, 130, 0.18), transparent 50%),
      linear-gradient(160deg, #121820 0%, #0f1419 45%, #151b24 100%);
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(400px, calc(100vw - 32px));
  padding: 36px 32px 28px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-brand {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
  background: linear-gradient(135deg, #1a73e8, #0b57d0);
}

.login-title {
  margin: 4px 0 0;
  font-size: 26px;
  font-weight: 700;
  color: #1a1f2c;
  letter-spacing: -0.02em;
}

.login-sub {
  margin: 0 0 8px;
  color: #667085;
  font-size: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #344054;
}

.login-btn {
  margin-top: 6px;
  width: 100%;
}

.login-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #98a2b3;
  text-align: center;
}
</style>

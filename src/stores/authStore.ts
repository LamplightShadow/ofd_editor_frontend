import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from '@/types/auth'
import {
    clearAuthStorage,
    createUserApi,
    fetchMeApi,
    getStoredToken,
    getStoredUser,
    listUsersApi,
    loginApi,
    persistAuth,
    resetUserPasswordApi,
    setUserEnabledApi,
} from '@/api/authApi'

export const useAuthStore = defineStore('auth', () => {
    const token = ref<string | null>(getStoredToken())
    const user = ref<UserInfo | null>(getStoredUser())
    const bootstrapped = ref(false)
    const loading = ref(false)

    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === 'ADMIN')
    const displayLabel = computed(() =>
        user.value?.displayName || user.value?.username || '未登录',
    )

    async function bootstrap() {
        if (bootstrapped.value) return
        loading.value = true
        try {
            if (!token.value) {
                user.value = null
                return
            }
            const me = await fetchMeApi()
            user.value = me
            persistAuth(token.value, me)
        } catch {
            clearAuthStorage()
            token.value = null
            user.value = null
        } finally {
            bootstrapped.value = true
            loading.value = false
        }
    }

    async function login(username: string, password: string) {
        loading.value = true
        try {
            const result = await loginApi(username, password)
            token.value = result.token
            user.value = result.user
            persistAuth(result.token, result.user)
            bootstrapped.value = true
        } finally {
            loading.value = false
        }
    }

    function logout() {
        clearAuthStorage()
        token.value = null
        user.value = null
    }

    async function listUsers() {
        return listUsersApi()
    }

    async function createUser(payload: {
        username: string
        password: string
        displayName?: string
        role: 'ADMIN' | 'USER'
    }) {
        return createUserApi(payload)
    }

    async function setUserEnabled(id: number, enabled: boolean) {
        return setUserEnabledApi(id, enabled)
    }

    async function resetUserPassword(id: number, password: string) {
        return resetUserPasswordApi(id, password)
    }

    return {
        token,
        user,
        bootstrapped,
        loading,
        isAuthenticated,
        isAdmin,
        displayLabel,
        bootstrap,
        login,
        logout,
        listUsers,
        createUser,
        setUserEnabled,
        resetUserPassword,
    }
})

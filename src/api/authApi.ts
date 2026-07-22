import axios from 'axios'
import type { UserInfo, UserRole } from '@/types/auth'

const TOKEN_KEY = 'ofd_studio_token'
const USER_KEY = 'ofd_studio_user'

export const authHttp = axios.create({
    baseURL: '/api',
    timeout: 30_000,
})

authHttp.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

authHttp.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error?.response?.status === 401 && !String(error?.config?.url || '').includes('/auth/login')) {
            clearAuthStorage()
            window.dispatchEvent(new CustomEvent('ofd-auth-expired'))
        }
        return Promise.reject(error)
    },
)

function readErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as { response?: { data?: { message?: string } }; message?: string }
    return anyErr?.response?.data?.message || anyErr?.message || fallback
}

export function getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as UserInfo
    } catch {
        return null
    }
}

export function persistAuth(token: string, user: UserInfo) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthStorage() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
}

export async function loginApi(username: string, password: string): Promise<{ token: string; user: UserInfo }> {
    try {
        const { data } = await authHttp.post('/auth/login', { username, password })
        return {
            token: data.token as string,
            user: data.user as UserInfo,
        }
    } catch (e) {
        throw new Error(readErrorMessage(e, '登录失败'))
    }
}

export async function fetchMeApi(): Promise<UserInfo> {
    try {
        const { data } = await authHttp.get('/auth/me')
        return data as UserInfo
    } catch (e) {
        throw new Error(readErrorMessage(e, '获取用户信息失败'))
    }
}

export async function listUsersApi(): Promise<UserInfo[]> {
    try {
        const { data } = await authHttp.get('/admin/users')
        return data as UserInfo[]
    } catch (e) {
        throw new Error(readErrorMessage(e, '获取用户列表失败'))
    }
}

export async function createUserApi(payload: {
    username: string
    password: string
    displayName?: string
    role: UserRole
}): Promise<UserInfo> {
    try {
        const { data } = await authHttp.post('/admin/users', payload)
        return data as UserInfo
    } catch (e) {
        throw new Error(readErrorMessage(e, '创建用户失败'))
    }
}

export async function setUserEnabledApi(id: number, enabled: boolean): Promise<UserInfo> {
    try {
        const { data } = await authHttp.put(`/admin/users/${id}/enabled`, null, {
            params: { enabled },
        })
        return data as UserInfo
    } catch (e) {
        throw new Error(readErrorMessage(e, '更新用户状态失败'))
    }
}

export async function resetUserPasswordApi(id: number, password: string): Promise<void> {
    try {
        await authHttp.put(`/admin/users/${id}/password`, { password })
    } catch (e) {
        throw new Error(readErrorMessage(e, '重置密码失败'))
    }
}

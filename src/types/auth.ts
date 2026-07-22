export type UserRole = 'ADMIN' | 'USER'

export interface UserInfo {
    id: number
    username: string
    displayName?: string | null
    role: UserRole
    enabled: boolean
    createdAt?: string | null
}

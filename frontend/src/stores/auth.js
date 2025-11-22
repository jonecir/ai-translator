import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null, // opcional
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
  },
  actions: {
    setToken(t) { this.token = t; localStorage.setItem('token', t) },
    clear() { this.token = null; this.user = null; localStorage.removeItem('token') },
  },
})

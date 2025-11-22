<script setup>
  import { ref } from 'vue'
  import api from '../services/api'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'

  const email = ref('admin@example.com')
  const password = ref('admin')
  const error = ref('')
  const ok = ref(false)
  const loading = ref(false)
  const router = useRouter()
  const auth = useAuthStore()

  const submit = async () => {
    error.value = ''; ok.value = false; loading.value = true
    try {
      const { data } = await api.post('/login', { email: email.value, password: password.value })
      auth.setToken(data.token)
      ok.value = true
      setTimeout(() => router.push('/jobs'), 600)
    } catch (e) {
      error.value = e?.response?.data?.error || e.message
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="max-w-sm space-y-4">
    <h2 class="text-xl font-semibold">Login</h2>

    <div v-if="ok" class="text-green-700 bg-green-100 border border-green-200 px-3 py-2 rounded">
      Login efetuado! Redirecionando…
    </div>
    <div v-if="error" class="text-red-700 bg-red-100 border border-red-200 px-3 py-2 rounded">
      {{ error }}
    </div>

    <form @submit.prevent="submit" class="space-y-3">
      <div>
        <label class="block text-sm text-gray-600">Email</label>
        <input v-model="email" type="email" class="w-full rounded border px-3 py-2 focus:outline-none focus:ring" />
      </div>
      <div>
        <label class="block text-sm text-gray-600">Senha</label>
        <input v-model="password" type="password" class="w-full rounded border px-3 py-2 focus:outline-none focus:ring" />
      </div>
      <button :disabled="loading"
        class="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-50 hover:bg-blue-700">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

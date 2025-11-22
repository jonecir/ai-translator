import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    timeout: 20000
})


api.interceptors.request.use((config) => {
    //const token = localStorage.getItem('token')
    const auth = useAuthStore()
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
    
    return config
})


api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)


export default api
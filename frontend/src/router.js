import { createRouter, createWebHistory } from 'vue-router'
import JobsView from './views/JobsView.vue'
import GlossariesView from './views/GlossariesView.vue'


const routes = [
    { path: '/', redirect: '/jobs' },
    { path: '/jobs', component: JobsView },
    { path: '/glossaries', component: GlossariesView }
]


export default createRouter({ history: createWebHistory(), routes })
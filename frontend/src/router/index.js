import { createRouter, createWebHistory } from 'vue-router'
import Directory from '../views/Directory.vue'

const routes = [
  {
    path: '/',
    name: 'Directory',
    component: Directory,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:id',
    name: 'ProfileDetail',
    component: () => import('../views/ProfileDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/form/:id?',
    name: 'AlumniForm',
    component: () => import('../views/AlumniForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/AdminUsers.vue'),
    meta: { requiresAuth: true, adminOnly: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.guestOnly && token) {
    next('/')
  } else if (to.meta.adminOnly && user.role !== 'admin') {
    next('/')
  } else {
    next()
  }
})

export default router

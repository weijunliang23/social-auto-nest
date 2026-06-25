<template>

  <div class="login-page">

    <section class="login-brand">

      <div class="brand-bg" aria-hidden="true" />

      <div class="brand-content">

        <div class="brand-logo-row">

          <div class="brand-logo-icon" :class="{ 'is-image': brandLogoUrl }">
            <img
              v-if="brandLogoUrl"
              :src="brandLogoUrl"
              :alt="brandName"
              class="brand-logo-img"
            />
            <el-icon v-else :size="28">
              <Medal />
            </el-icon>
          </div>

          <span class="brand-pro-name">{{ brandProName }}</span>

        </div>



        <h1 class="brand-title">{{ systemTitle }}</h1>

        <p class="brand-desc">

          一站式管理抖音、快手、小红书、视频号等平台账号与内容发布，助力{{ brandName }}团队高效运营。

        </p>



        <div class="brand-stats">

          <div class="glass-card">

            <div class="glass-label">活跃账号</div>

            <div class="glass-value">2,480+</div>

          </div>

          <div class="glass-card">

            <div class="glass-label">今日发布</div>

            <div class="glass-value">12,052</div>

          </div>

        </div>

      </div>



      <div class="brand-sentinel">

        <span>SENTINEL NODE: 0x449A</span>

        <span class="sentinel-dot" />

      </div>

    </section>



    <section class="login-form-panel">

      <div class="form-wrap">

        <div class="mobile-brand">
          <img
            v-if="brandLogoUrl"
            :src="brandLogoUrl"
            :alt="brandName"
            class="mobile-brand-logo"
          />
          <el-icon v-else class="mobile-brand-icon" :size="32">
            <Medal />
          </el-icon>

          <span>{{ brandProName }}</span>

        </div>



        <div class="form-header">

          <h2>欢迎回来</h2>

          <p>请登录您的管理账户以继续</p>

        </div>



        <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @submit.prevent="handleLogin">

          <el-form-item prop="username" class="form-field">

            <label class="field-label">用户名 / 邮箱</label>

            <el-input v-model="form.username" maxlength="15" placeholder="输入您的账号" size="large" class="field-input">

              <template #prefix>

                <el-icon class="field-icon">
                  <User />
                </el-icon>

              </template>

            </el-input>

          </el-form-item>



          <el-form-item prop="password" class="form-field">

            <label class="field-label">密码</label>

            <el-input v-model="form.password" :type="showPassword ? 'text' : 'password'" maxlength="15"
              placeholder="输入您的密码" size="large" class="field-input" @keyup.enter="handleLogin">

              <template #prefix>

                <el-icon class="field-icon">
                  <Lock />
                </el-icon>

              </template>

              <template #suffix>

                <el-icon class="pwd-toggle" @click="showPassword = !showPassword">

                  <View v-if="showPassword" />

                  <Hide v-else />

                </el-icon>

              </template>

            </el-input>

          </el-form-item>



          <div class="form-options">

            <el-checkbox v-model="rememberMe">记住我</el-checkbox>

            <a class="forgot-link" href="#" @click.prevent="handleForgotPassword">忘记密码？</a>

          </div>



          <el-button type="primary" class="login-btn" size="large" :loading="loading" @click="handleLogin">

            <span v-if="!loading">登录</span>

            <el-icon v-if="!loading" class="login-btn-icon">
              <Right />
            </el-icon>

          </el-button>

        </el-form>



        <p class="register-tip">

          还没有账号？

          <a href="#" @click.prevent="goRegister">注册账号</a>

        </p>



        <div class="platform-row">

          <span class="platform-label">多平台协同作业</span>

          <div class="platform-icons">

            <el-tooltip content="抖音" placement="top">

              <span class="platform-icon platform-douyin">
                <VideoCamera />
              </span>

            </el-tooltip>

            <el-tooltip content="小红书" placement="top">

              <span class="platform-icon platform-xhs">
                <MagicStick />
              </span>

            </el-tooltip>

            <el-tooltip content="快手" placement="top">

              <span class="platform-icon platform-kuaishou">
                <Lightning />
              </span>

            </el-tooltip>

            <el-tooltip content="视频号" placement="top">

              <span class="platform-icon platform-shipinhao">
                <VideoPlay />
              </span>

            </el-tooltip>

          </div>

        </div>

      </div>



      <footer class="login-footer">

        <span class="footer-brand">{{ brandName }}</span>

        <div class="footer-links">

          <a href="#" @click.prevent>Privacy Policy</a>

          <a href="#" @click.prevent>Terms of Service</a>

          <a href="#" @click.prevent>Contact Support</a>

        </div>

        <span class="footer-copy">© {{ currentYear }} {{ brandName }}. All rights reserved.</span>

      </footer>

    </section>

  </div>

</template>



<script setup>

import { computed, onMounted, reactive, ref } from 'vue'

import { useRouter } from 'vue-router'

import { ElMessage } from 'element-plus'

import {

  Hide,

  Lightning,

  Lock,

  MagicStick,

  Medal,

  Right,

  User,

  VideoCamera,

  VideoPlay,

  View,

} from '@element-plus/icons-vue'

import { http } from '@/utils/request'

import { setAuth } from '@/utils/auth'



const REMEMBER_KEY = 'remembered_username'



const router = useRouter()

const formRef = ref()

const loading = ref(false)

const showPassword = ref(false)

const rememberMe = ref(false)



const brandName = import.meta.env.VITE_APP_BRAND_NAME || '找大状'

const brandLogoUrl = (import.meta.env.VITE_APP_BRAND_LOGO || '').trim()

const brandProName = computed(() => `${brandName} Pro-SaaS`)

const systemTitle = computed(() => `${brandName}内容运营管理系统`)

const currentYear = new Date().getFullYear()



const form = reactive({

  username: '',

  password: '',

})



const rules = {

  username: [

    { required: true, message: '请输入用户名', trigger: 'blur' },

    { max: 15, message: '用户名不能超过15个字符', trigger: 'blur' },

  ],

  password: [

    { required: true, message: '请输入密码', trigger: 'blur' },

    { max: 15, message: '密码不能超过15个字符', trigger: 'blur' },

  ],

}



onMounted(() => {

  const saved = localStorage.getItem(REMEMBER_KEY)

  if (saved) {

    form.username = saved

    rememberMe.value = true

  }

})



const handleLogin = async () => {

  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) return



  loading.value = true

  try {

    const res = await http.post('/auth/login', {

      username: form.username.trim(),

      password: form.password,

    })

    if (rememberMe.value) {

      localStorage.setItem(REMEMBER_KEY, form.username.trim())

    } else {

      localStorage.removeItem(REMEMBER_KEY)

    }

    setAuth(res.data.token, res.data.username)

    ElMessage.success(res.msg || '登录成功')

    router.push('/')

  } catch {

    // 错误已由拦截器提示

  } finally {

    loading.value = false

  }

}



const goRegister = () => {

  router.push('/register')

}



const handleForgotPassword = () => {

  ElMessage.info('请联系管理员重置密码')

}

</script>



<style scoped lang="scss">
$sidebar-deep: #001529;

$primary-blue: #409eff;

$primary-blue-hover: #53a8ff;

$secondary-blue: #0060a9;

$surface-low: #f3f4f6;

$outline-variant: #c4c6cd;

$text-muted: #43474d;

$text-secondary: #74777d;



.login-page {

  display: flex;

  min-height: 100vh;

  overflow: hidden;

}



.login-brand {

  position: relative;

  display: none;

  width: 60%;

  flex-direction: column;

  justify-content: center;

  overflow: hidden;

  background: $sidebar-deep;



  @media (min-width: 768px) {

    display: flex;

  }

}



.brand-bg {

  position: absolute;

  inset: 0;

  background: linear-gradient(135deg, #001529 0%, #003a70 45%, #1a6bb5 100%);

  background-size: 200% 200%;

  animation: gradientShift 12s ease infinite;



  &::after {

    content: '';

    position: absolute;

    inset: 0;

    background: radial-gradient(ellipse at 30% 50%, rgba(64, 158, 255, 0.18) 0%, transparent 60%);

  }

}



@keyframes gradientShift {

  0%,

  100% {

    background-position: 0% 50%;

  }

  50% {

    background-position: 100% 50%;

  }

}



.brand-content {

  position: relative;

  z-index: 1;

  max-width: 640px;

  padding: 2rem 3rem;

  animation: fadeInUp 0.8s ease-out forwards;

}



.brand-logo-row {

  display: flex;

  align-items: center;

  gap: 12px;

  margin-bottom: 1.5rem;

  animation: float 4s ease-in-out infinite;

}



.brand-logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: $primary-blue;
  color: #fff;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.35);
  overflow: hidden;

  &.is-image {
    background: transparent;
    box-shadow: none;
  }
}

.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mobile-brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}



.brand-pro-name {

  font-size: 24px;

  font-weight: 600;

  color: #fff;

  letter-spacing: -0.02em;

}



.brand-title {

  margin: 0 0 1rem;

  font-size: 32px;

  font-weight: 700;

  line-height: 1.25;

  color: #fff;

  letter-spacing: 0.02em;

}



.brand-desc {

  margin: 0 0 1.5rem;

  font-size: 16px;

  line-height: 1.6;

  color: rgba(255, 255, 255, 0.8);

}



.brand-stats {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 1rem;

}



.glass-card {

  padding: 1rem;

  border-radius: 12px;

  background: rgba(255, 255, 255, 0.1);

  backdrop-filter: blur(12px);

  border: 1px solid rgba(255, 255, 255, 0.2);

}



.glass-label {

  margin-bottom: 4px;

  font-size: 12px;

  font-weight: 500;

  letter-spacing: 0.05em;

  text-transform: uppercase;

  color: rgba(255, 255, 255, 0.6);

}



.glass-value {

  font-size: 20px;

  font-weight: 600;

  color: #fff;

}



.brand-sentinel {

  position: absolute;

  bottom: 2rem;

  left: 2rem;

  z-index: 1;

  display: flex;

  align-items: center;

  gap: 8px;

  font-size: 12px;

  color: rgba(255, 255, 255, 0.4);

}



.sentinel-dot {

  width: 6px;

  height: 6px;

  border-radius: 50%;

  background: #67c23a;

  animation: pulse 2s ease-in-out infinite;

}



@keyframes fadeInUp {

  from {

    opacity: 0;

    transform: translateY(20px);

  }

  to {

    opacity: 1;

    transform: translateY(0);

  }

}



@keyframes float {

  0%,

  100% {

    transform: translateY(0);

  }

  50% {

    transform: translateY(-8px);

  }

}



@keyframes pulse {

  0%,

  100% {

    opacity: 1;

  }

  50% {

    opacity: 0.4;

  }

}



.login-form-panel {

  position: relative;

  display: flex;

  width: 100%;

  flex-direction: column;

  justify-content: center;

  background: #fff;



  @media (min-width: 768px) {

    width: 40%;

  }

}



.form-wrap {

  width: 100%;

  max-width: 420px;

  margin: 0 auto;

  padding: 2rem;

  animation: fadeInUp 0.8s ease-out 0.1s both;

}



.mobile-brand {

  display: flex;

  align-items: center;

  gap: 12px;

  margin-bottom: 1.5rem;

  font-size: 20px;

  font-weight: 600;

  color: #191c1e;



  @media (min-width: 768px) {

    display: none;

  }



  .mobile-brand-icon {

    color: $primary-blue;

  }

}



.form-header {

  margin-bottom: 1.5rem;



  h2 {

    margin: 0 0 8px;

    font-size: 24px;

    font-weight: 600;

    color: #191c1e;

  }



  p {

    margin: 0;

    font-size: 14px;

    color: $text-muted;

  }

}



.login-form {

  :deep(.el-form-item) {

    margin-bottom: 0;

  }



  :deep(.el-form-item__error) {

    padding-top: 4px;

  }

}



.form-field {

  margin-bottom: 1rem !important;

}



.field-label {

  display: block;

  margin-bottom: 4px;

  margin-left: 4px;

  font-size: 12px;

  font-weight: 500;

  color: $text-muted;

}



.field-input {

  :deep(.el-input__wrapper) {

    padding: 10px 12px 10px 8px;

    border-radius: 8px;

    background: $surface-low;

    box-shadow: 0 0 0 1px $outline-variant inset;



    &.is-focus {

      box-shadow:

        0 0 0 1px $primary-blue inset,

        0 0 0 4px rgba(64, 158, 255, 0.1);

    }

  }



  :deep(.el-input__inner) {

    font-size: 14px;

    color: #191c1e;



    &::placeholder {

      color: $text-secondary;

    }

  }

}



.field-icon {

  color: $text-secondary;

  transition: color 0.2s;

}



.field-input:focus-within .field-icon {

  color: $primary-blue;

}



.pwd-toggle {

  cursor: pointer;

  color: $text-secondary;

  transition: color 0.2s;



  &:hover {

    color: #191c1e;

  }

}



.form-options {

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin: 0.5rem 0 1.25rem;

  font-size: 12px;



  :deep(.el-checkbox__label) {

    font-size: 12px;

    color: $text-muted;

  }



  .forgot-link {

    color: $secondary-blue;

    text-decoration: none;



    &:hover {

      text-decoration: underline;

    }

  }

}



.login-btn {

  width: 100%;

  height: 48px;

  border: none;

  border-radius: 8px;

  font-size: 16px;

  font-weight: 600;

  background: $primary-blue;

  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.25);

  transition: transform 0.2s, box-shadow 0.2s;



  &:hover:not(:disabled) {

    transform: scale(1.02);

    background: $primary-blue-hover;

  }



  &:active:not(:disabled) {

    transform: scale(0.98);

  }



  .login-btn-icon {

    margin-left: 6px;

  }

}



.register-tip {

  margin: 1.5rem 0 0;

  text-align: center;

  font-size: 14px;

  color: $text-muted;



  a {

    color: $secondary-blue;

    font-weight: 600;

    text-decoration: none;



    &:hover {

      text-decoration: underline;

    }

  }

}



.platform-row {

  margin-top: 1.5rem;

  padding-top: 1.5rem;

  border-top: 1px solid rgba(196, 198, 205, 0.3);

  text-align: center;

}



.platform-label {

  display: block;

  margin-bottom: 1rem;

  font-size: 12px;

  font-weight: 500;

  color: $text-secondary;

}



.platform-icons {

  display: flex;

  justify-content: center;

  gap: 1.5rem;

  opacity: 0.4;

  filter: grayscale(1);

  transition: opacity 0.5s, filter 0.5s;



  &:hover {

    opacity: 1;

    filter: none;

  }

}



.platform-icon {

  display: flex;

  font-size: 24px;



  &.platform-douyin {

    color: #f56c6c;

  }

  &.platform-xhs {

    color: #909399;

  }

  &.platform-kuaishou {

    color: #67c23a;

  }

  &.platform-shipinhao {

    color: #e6a23c;

  }

}



.login-footer {

  display: flex;

  flex-wrap: wrap;

  align-items: center;

  justify-content: center;

  gap: 12px 24px;

  padding: 1.5rem 2rem 2rem;

  font-size: 12px;



  .footer-brand {

    font-weight: 700;

    color: #191c1e;

  }



  .footer-links {

    display: flex;

    flex-wrap: wrap;

    gap: 12px;



    a {

      color: $text-muted;

      text-decoration: underline;

      transition: color 0.2s;



      &:hover {

        color: #191c1e;

      }

    }

  }



  .footer-copy {

    color: $text-muted;

    font-size: 14px;

  }

}

@media (max-width: 767px) {
  .login-page {
    flex-direction: column;
    overflow-y: auto;
  }

  .login-form-panel {
    min-height: 100vh;
    justify-content: flex-start;
  }

  .form-wrap {
    padding: 1.5rem 1.25rem 2rem;
    max-width: 100%;
  }

  .form-header h2 {
    font-size: 20px;
  }

  .login-footer {
    flex-direction: column;
    gap: 8px;
    padding: 1rem 1.25rem 1.5rem;
    text-align: center;

    .footer-links {
      justify-content: center;
    }
  }

  .platform-icons {
    gap: 1rem;
  }
}
</style>

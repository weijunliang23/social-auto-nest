<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <h2 class="auth-title">注册</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" @submit.prevent>
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            maxlength="15"
            show-word-limit
            placeholder="最多15个字符"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            maxlength="15"
            show-password
            placeholder="最多15个字符"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            maxlength="15"
            show-password
            placeholder="再次输入密码"
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleRegister">
            注册
          </el-button>
          <el-button @click="goLogin">返回登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@/utils/request'
import { setAuth } from '@/utils/auth'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { max: 15, message: '用户名不能超过15个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { max: 15, message: '密码不能超过15个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await http.post('/auth/register', {
      username: form.username.trim(),
      password: form.password
    })
    setAuth(res.data.token, res.data.username)
    ElMessage.success(res.msg || '注册成功')
    router.push('/')
  } catch {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

const goLogin = () => {
  router.push('/login')
}
</script>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #001529 0%, #003a70 100%);
}

.auth-card {
  width: 420px;
  padding: 8px 12px 4px;
}

.auth-title {
  margin: 0 0 24px;
  text-align: center;
  font-size: 22px;
  color: #303133;
}

@media (max-width: 767px) {
  .auth-page {
    padding: 16px;
    align-items: flex-start;
    padding-top: 10vh;
  }

  .auth-card {
    width: 100%;
    max-width: 420px;
    padding: 4px 8px 0;
  }

  .auth-title {
    font-size: 20px;
    margin-bottom: 20px;
  }

  :deep(.el-form-item__label) {
    width: auto !important;
    text-align: left;
    float: none;
    display: block;
    padding-bottom: 4px;
  }

  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }

  :deep(.el-form-item:last-child .el-form-item__content) {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .el-button {
      width: 100%;
      margin-left: 0 !important;
    }
  }
}
</style>

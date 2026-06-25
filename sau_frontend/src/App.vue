<template>

  <div id="app">

    <router-view v-if="isAuthPage" />

    <el-container v-else class="app-layout">

      <div
        v-if="isMobile && sidebarVisible"
        class="sidebar-overlay"
        @click="sidebarVisible = false"
      />

      <el-aside
        :width="isMobile ? '200px' : (isCollapse ? '64px' : '200px')"
        :class="{ 'sidebar-open': isMobile && sidebarVisible }"
      >

        <div class="sidebar">

          <div class="logo">

            <img v-show="isCollapse" src="/logo.gif" alt="Logo" class="logo-img">

            <h2 v-show="!isCollapse">找大状运营系统</h2>

          </div>

          <el-menu :router="true" :default-active="activeMenu" :collapse="!isMobile && isCollapse" class="sidebar-menu"
            background-color="#001529" text-color="#fff" active-text-color="#409EFF">

            <el-menu-item index="/">

              <el-icon>

                <HomeFilled />

              </el-icon>

              <span>首页</span>

            </el-menu-item>

            <el-menu-item index="/account-management">

              <el-icon>

                <User />

              </el-icon>

              <span>账号管理</span>

            </el-menu-item>

            <el-menu-item index="/material-management">

              <el-icon>

                <Picture />

              </el-icon>

              <span>素材管理</span>

            </el-menu-item>

            <el-menu-item index="/publish-center">

              <el-icon>

                <Upload />

              </el-icon>

              <span>发布中心</span>

            </el-menu-item>

            <el-menu-item index="/publish-records">

              <el-icon>

                <Document />

              </el-icon>

              <span>发布记录</span>

            </el-menu-item>

            <el-menu-item index="/about">

              <el-icon>

                <DataAnalysis />

              </el-icon>

              <span>关于</span>

            </el-menu-item>

          </el-menu>

        </div>

      </el-aside>

      <el-container>

        <el-header>

          <div class="header-content">

            <div class="header-left">

              <el-icon class="toggle-sidebar" @click="toggleSidebar">

                <Fold />

              </el-icon>

            </div>

            <div class="header-right">

              <el-dropdown trigger="click" @command="handleCommand">

                <span class="user-dropdown">

                  <el-icon>
                    <User />
                  </el-icon>

                  <span class="username">{{ username || '用户' }}</span>

                  <el-icon>
                    <ArrowDown />
                  </el-icon>

                </span>

                <template #dropdown>

                  <el-dropdown-menu>

                    <el-dropdown-item command="logout">退出登录</el-dropdown-item>

                  </el-dropdown-menu>

                </template>

              </el-dropdown>

            </div>

          </div>

        </el-header>

        <el-main>

          <router-view />

        </el-main>

      </el-container>

    </el-container>

  </div>

</template>



<script setup>

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import {

  HomeFilled, User, DataAnalysis,

  Fold, Picture, Upload, Document, ArrowDown

} from '@element-plus/icons-vue'

import { clearAuth, getUsername } from '@/utils/auth'



const route = useRoute()

const router = useRouter()



const activeMenu = computed(() => route.path)

const isAuthPage = computed(() => route.meta.public === true)

const username = ref(getUsername())



const isCollapse = ref(false)
const isMobile = ref(false)
const sidebarVisible = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 767
  if (!isMobile.value) {
    sidebarVisible.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(() => route.path, () => {
  if (isMobile.value) {
    sidebarVisible.value = false
  }
})

const toggleSidebar = () => {
  if (isMobile.value) {
    sidebarVisible.value = !sidebarVisible.value
  } else {
    isCollapse.value = !isCollapse.value
  }
}



const handleCommand = (command) => {

  if (command === 'logout') {

    clearAuth()

    router.push('/login')

  }

}

</script>



<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;



#app {

  min-height: 100vh;

}



.el-container {

  height: 100vh;

}



.el-aside {

  background-color: #001529;

  color: #fff;

  height: 100vh;

  overflow: hidden;

  transition: width 0.3s, transform 0.3s;

  flex-shrink: 0;



  .sidebar {

    display: flex;

    flex-direction: column;

    height: 100%;



    .logo {

      height: 60px;

      padding: 0 16px;

      display: flex;

      align-items: center;

      background-color: #002140;

      overflow: hidden;



      .logo-img {

        width: 32px;

        height: 32px;

        margin-right: 12px;

      }



      h2 {

        color: #fff;

        font-size: 16px;

        font-weight: 600;

        white-space: nowrap;

        margin: 0;

      }

    }



    .sidebar-menu {

      border-right: none;

      flex: 1;



      .el-menu-item {

        display: flex;

        align-items: center;



        .el-icon {

          margin-right: 10px;

          font-size: 18px;

        }

      }

    }

  }

}



.el-header {

  background-color: #fff;

  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

  padding: 0;

  height: 60px;



  .header-content {

    display: flex;

    justify-content: space-between;

    align-items: center;

    height: 100%;

    padding: 0 16px;



    .header-left {

      .toggle-sidebar {

        font-size: 20px;

        cursor: pointer;

        color: $text-regular;



        &:hover {

          color: $primary-color;

        }

      }

    }



    .header-right {

      .user-dropdown {

        display: flex;

        align-items: center;

        cursor: pointer;



        .username {

          margin: 0 8px;

          color: $text-regular;

        }



        .el-icon {

          font-size: 12px;

          color: $text-secondary;

        }

      }

    }

  }

}



.el-main {

  background-color: $bg-color-page;

  padding: 20px;

  overflow-y: auto;

}

.sidebar-overlay {
  display: none;
}

@media (max-width: 767px) {
  .app-layout {
    position: relative;
  }

  .el-aside {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1001;
    transform: translateX(-100%);

    &.sidebar-open {
      transform: translateX(0);
    }
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.45);
  }

  .el-main {
    padding: 12px;
  }

  .header-right .username {
    display: none;
  }
}
</style>

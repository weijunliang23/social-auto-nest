import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAccountStore = defineStore('account', () => {
  // 存储所有账号信息
  const accounts = ref([])
  
  // 平台类型映射
  const platformTypes = {
    1: '小红书',
    2: '视频号',
    3: '抖音',
    4: '快手'
  }
  
  // 设置账号列表
  const setAccounts = (accountsData) => {
    // 转换后端返回的数据格式为前端使用的格式
    accounts.value = accountsData.map(item => {
      return {
        id: item[0],
        type: item[1],
        filePath: item[2],
        name: item[3],
        status: mapStatus(item[4]),
        platform: platformTypes[item[1]] || '未知'
      }
    })
  }

  const mapStatus = (statusCode) => {
    if (statusCode === -1) {
      return '验证中'
    }
    return statusCode === 1 ? '正常' : '异常'
  }

  // 更新单个账号状态（校验后增量更新）
  const updateAccountStatus = (id, statusCode) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index].status = mapStatus(statusCode)
    }
  }

  const setAccountValidating = (id) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index].status = '验证中'
    }
  }
  
  // 添加账号
  const addAccount = (account) => {
    accounts.value.push(account)
  }
  
  // 更新账号
  const updateAccount = (id, updatedAccount) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updatedAccount }
    }
  }
  
  // 删除账号
  const deleteAccount = (id) => {
    accounts.value = accounts.value.filter(acc => acc.id !== id)
  }
  
  // 根据平台获取账号
  const getAccountsByPlatform = (platform) => {
    return accounts.value.filter(acc => acc.platform === platform)
  }
  
  return {
    accounts,
    setAccounts,
    updateAccountStatus,
    setAccountValidating,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountsByPlatform
  }
})
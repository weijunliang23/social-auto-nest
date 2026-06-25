import request, { http } from '@/utils/request'

const resolveStoredFilename = (filePath) => {
  if (!filePath) return ''
  return filePath.includes('/') ? filePath.split('/').pop() : filePath
}

// 素材管理API
export const materialApi = {
  // 获取所有素材
  getAllMaterials: () => {
    return http.get('/getFiles')
  },

  // 上传素材
  uploadMaterial: (formData, onUploadProgress) => {
    return http.upload('/uploadSave', formData, onUploadProgress)
  },

  // 删除素材
  deleteMaterial: (id) => {
    return http.get(`/deleteFile?id=${id}`)
  },

  // 通过鉴权请求获取素材二进制（预览/下载用）
  fetchMaterialBlob: async (filePath, { download = false } = {}) => {
    const filename = resolveStoredFilename(filePath)
    try {
      const response = await request.get('/getFile', {
        params: {
          filename,
          ...(download ? { download: '1' } : {}),
        },
        responseType: 'blob',
      })

      const blob = response.data
      if (blob?.type?.includes('application/json')) {
        const text = await blob.text()
        const payload = JSON.parse(text)
        throw new Error(payload.msg || '获取文件失败')
      }

      return blob
    } catch (error) {
      const blob = error.response?.data
      if (blob instanceof Blob && blob.type?.includes('application/json')) {
        const text = await blob.text()
        const payload = JSON.parse(text)
        throw new Error(payload.msg || '获取文件失败')
      }
      throw error
    }
  },

  // 下载素材（走 Nest /download 路由，需配合 fetchMaterialBlob 带鉴权）
  downloadMaterial: (filePath) => {
    const filename = resolveStoredFilename(filePath)
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5409'
    return `${base}/download/${encodeURIComponent(filename)}`
  },

  // 获取素材预览URL（仅适用于无需鉴权的场景；Nest 后端请用 fetchMaterialBlob）
  getMaterialPreviewUrl: (filename) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5409'
    return `${base}/getFile?filename=${encodeURIComponent(filename)}`
  },
}

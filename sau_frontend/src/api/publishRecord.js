import { http } from '@/utils/request'
import { sleep } from '@/utils/publishCookieRecovery'

export const publishRecordApi = {
  getPublishRecord: (id) => {
    return http.get('/getPublishRecord', { id })
  },

  /** 轮询直到 success / failed 或超时 */
  waitForPublishRecord: async (
    recordId,
    { intervalMs = 1500, timeoutMs = 30 * 60 * 1000 } = {}
  ) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      const res = await publishRecordApi.getPublishRecord(recordId)
      if (res.code !== 200 || !res.data) {
        throw new Error(res.msg || '查询发布状态失败')
      }
      const status = res.data.status
      if (status === 'success' || status === 'failed') {
        return res.data
      }
      await sleep(intervalMs)
    }
    throw new Error('发布超时，请到发布记录查看状态')
  },

  getPublishRecords: (params = {}) => {
    return http.get('/getPublishRecords', params)
  },

  deletePublishRecord: (id) => {
    return http.get(`/deletePublishRecord?id=${id}`)
  },
}

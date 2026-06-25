import { http } from '@/utils/request'

export const publishRecordApi = {
  getPublishRecords: (params = {}) => {
    return http.get('/getPublishRecords', params)
  },

  deletePublishRecord: (id) => {
    return http.get(`/deletePublishRecord?id=${id}`)
  },
}

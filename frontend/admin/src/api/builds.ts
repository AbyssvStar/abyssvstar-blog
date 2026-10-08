import { api } from './client'
import type { PageData, SiteBuildInfo } from './types'

/**
 * 静态站的构建记录。发布之后靠它回答「到底上线没有」——
 * 发布只写一条 PENDING，真正跑构建要等后端把积压的合并发出去。
 */
export const buildsApi = {
  list: (page: number, size: number) =>
    api.get<PageData<SiteBuildInfo>>(`/builds?page=${page}&size=${size}`),

  /** 手动重建。也只记一条 PENDING，合并与防抖交给后端定时任务 */
  trigger: () => api.post<SiteBuildInfo>('/builds/trigger'),
}
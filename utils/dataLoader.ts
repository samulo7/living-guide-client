// 在 TS 中单独声明一份 CityData，避免从 .uts 文件导入导致类型解析错误
type CityData = {
  version: number
  update_date: string
  total: number
  items: any[]
  meta?: {
    generated_at: string
    source: string
  }
}

// 微信小程序里不能用 uni.request 去请求 "/static/..." 这种本地资源路径
// 这里改为“编译期直接打包进代码”的方式读取 JSON，确保各端都稳定可用
import rawCityData from '../static/data/data.json'

export async function loadCityData(): Promise<CityData> {
  // raw json 由构建工具注入，运行时直接可用
  return rawCityData as CityData
}

// 兼容旧接口：页面里如果未来调用清缓存，不会报错
export function clearCache(): void {
  // no-op
}


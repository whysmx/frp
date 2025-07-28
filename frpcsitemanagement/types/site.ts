export type Proxy = {
  name: string
  type: string
  role: string
  server_name: string   // 匹配Vue版本的server_name
  sk: string
  bind_addr: string     // 匹配Vue版本的bind_addr
  bind_port: number     // 匹配Vue版本的bind_port
}

export type Site = {
  macAddress: string    // 主键，匹配Vue版本
  siteCode: string      // 站点编号，匹配Vue版本
  siteName: string      // 站点名称，匹配Vue版本
  password: string
  tags: string[]
  configs: Proxy[]      // 匹配Vue版本的configs字段名
}

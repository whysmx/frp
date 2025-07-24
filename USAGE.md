# FRP v0.27.1 使用指南

## 快速开始

### 1. 构建项目

```bash
make
```

构建完成后，会在 `bin/` 目录下生成 `frps` 和 `frpc` 两个可执行文件。

### 2. 服务端配置 (frps)

创建 `frps.ini` 配置文件：

```ini
[common]
bind_port = 7000
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = admin
```

启动服务端：

```bash
./bin/frps -c frps.ini
```

### 3. 客户端配置 (frpc)

创建 `frpc.ini` 配置文件：

```ini
[common]
server_addr = x.x.x.x  # 你的服务器IP
server_port = 7000

[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = 22
remote_port = 6000
```

启动客户端：

```bash
./bin/frpc -c frpc.ini
```

### 4. 访问服务

- SSH 访问：`ssh -oPort=6000 user@x.x.x.x`
- 管理面板：`http://x.x.x.x:7500`

## 更多配置

详细配置请参考：
- [完整服务端配置](conf/frps_full.ini)
- [完整客户端配置](conf/frpc_full.ini)
- [中文文档](README_zh.md)
- [英文文档](README.md)

## 版本信息

```bash
./bin/frps --version  # 输出: 0.27.1
./bin/frpc --version  # 输出: 0.27.1
```
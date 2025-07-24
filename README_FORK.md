# FRP v0.27.1 Fork

这是 [fatedier/frp](https://github.com/fatedier/frp) v0.27.1 版本的副本。

## 原项目信息

- 原项目地址: https://github.com/fatedier/frp
- 版本: v0.27.1
- 发布日期: 2019年
- 许可证: Apache License 2.0

## 关于 FRP

frp 是一个专注于内网穿透的高性能的反向代理应用，支持 TCP、UDP、HTTP、HTTPS 等多种协议。可以将内网服务以安全、便捷的方式通过具有公网 IP 节点的中转暴露到公网。

## 主要功能

- 客户端服务端通讯支持 TCP、KCP 以及 Websocket 等多种协议
- 采用 TCP 连接流式复用，在单个连接间承载更多请求，节省连接建立时间
- 代理组间的负载均衡
- 端口复用，多个服务通过同一个服务端端口暴露
- 多个原生支持的客户端插件（静态文件查看，HTTP、SOCK5 代理等），便于独立使用
- 高度扩展性的服务端插件系统，方便结合自身需求进行功能扩展
- 服务端和客户端 UI 页面

## 构建

```bash
make
```

## 使用

详细使用说明请参考原项目文档：
- [中文文档](README_zh.md)
- [English Documentation](README.md)

## 许可证

本项目遵循 Apache License 2.0 许可证。
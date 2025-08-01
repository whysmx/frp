# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is frp (Fast Reverse Proxy) - a Go-based reverse proxy tool that helps expose local servers behind NAT or firewalls to the internet. It's a fork/customization of the original fatedier/frp project with the module name `github.com/whysmx/frp`.

## Build and Development Commands

### Core Build Commands
```bash
# Build all components (equivalent to make fmt build)
make all

# Build both server and client binaries
make build

# Build specific components
make frps    # Server binary to bin/frps
make frpc    # Client binary to bin/frpc

# Format code
make fmt

# Clean built binaries
make clean
```

### Testing Commands
```bash
# Run unit tests for all modules
make gotest

# Run integration tests (requires test environment setup)
make ci

# Run all tests
make alltest

# Run unit tests with coverage (equivalent to make gotest)
make test
```

### Web Assets (if working with dashboard)
```bash
# Compile web assets into binary (requires web/frps/dist and web/frpc/dist)
make file
```

## Architecture

### Core Components

**Server Side (frps):**
- `cmd/frps/` - Server entry point and CLI
- `server/` - Core server logic including control, proxy management, and dashboard
- `server/proxy/` - Protocol-specific proxy implementations (TCP, UDP, HTTP, HTTPS, STCP, XTCP)
- `server/group/` - Load balancing group management

**Client Side (frpc):**
- `cmd/frpc/` - Client entry point and CLI subcommands
- `client/` - Core client logic including control connection, proxy management, and health checks
- `client/proxy/` - Client-side proxy implementations

**Shared Components:**
- `models/` - Protocol messages, configuration structs, and plugin interfaces
- `utils/` - Network utilities, logging, metrics, and virtual host management
- `assets/` - Embedded web dashboard assets

### Configuration System

frp uses INI-format configuration files:
- `conf/frps_full.ini` - Complete server configuration reference
- `conf/frpc_full.ini` - Complete client configuration reference
- Configuration supports environment variable templating with Go template syntax

### Protocol Support

- **TCP/UDP** - Basic port forwarding
- **HTTP/HTTPS** - Virtual host routing with custom domains
- **STCP** - Secret TCP for secure connections
- **XTCP** - P2P mode for direct client-to-client communication
- **Plugin System** - unix_domain_socket, http_proxy, socks5, static_file, https2http

### Key Features Architecture

- **Authentication** - Token-based auth between client and server
- **Encryption/Compression** - Optional per-proxy encryption and compression
- **Load Balancing** - Group-based load balancing for TCP proxies
- **Health Checks** - TCP and HTTP health checking for high availability
- **Dashboard** - Web-based monitoring and management interface
- **Hot Reload** - Runtime configuration updates via admin API

## Development Notes

### Module Structure
The codebase follows Go 1.12+ module structure with the module name `github.com/whysmx/frp`.

### Testing
- Unit tests in each package test core functionality
- Integration tests in `tests/ci/` require mock servers and validate end-to-end scenarios
- Test configuration files in `tests/ci/auto_test_*.ini`

### Configuration Security
This repository contains sample configuration files with default tokens. When deploying:
- Always change default tokens in production
- Configuration files are in `.gitignore` to prevent accidental commits of sensitive data

### Dashboard Development
The web dashboard source is in `web/frps/` and `web/frpc/` directories. Use `make file` to compile web assets into Go binaries after making changes.

## Frontend Development Rules (web/frpc-react/)

### CSS Variables and Tailwind CSS Configuration

**CRITICAL: CSS变量格式规则**
- Tailwind CSS配置文件 (`tailwind.config.ts`) 期望HSL格式：`hsl(var(--variable-name))`
- CSS变量 (`app/globals.css`) 必须使用HSL格式：`--variable-name: H S% L%`
- **错误示例**: `--border: 209 209 214` (RGB格式)
- **正确示例**: `--border: 240 6% 84%` (HSL格式)

**常见问题排查**:
- 如果UI组件显示浏览器默认颜色（如黄色边框），检查CSS变量格式是否正确
- 所有颜色变量必须在 `:root` 和 `.dark` 中都定义
- 使用在线工具将RGB转HSL：rgb(209,209,214) → hsl(240,6%,84%)

**配色方案**:
- 使用苹果设计系统配色
- 主色：`--primary: 214 100% 50%` (苹果系统蓝 #007AFF)
- 边框：`--border: 240 6% 84%` (浅灰 #D1D1D6)  
- 背景：`--background: 0 0% 100%` (纯白)

### 样式调试步骤
1. 检查 `tailwind.config.ts` 中颜色变量定义
2. 检查 `app/globals.css` 中CSS变量格式
3. 确认所有变量都有对应的HSL值
4. 使用浏览器开发者工具验证computed样式
# Sub-Collect

一个用于收集、过滤和管理各种代理协议订阅的工具。

## 功能特点

-   支持多种协议：VLESS、VMess、Trojan、SSR、SS、Hysteria、Hysteria2
-   智能节点过滤：
    -   IP 地理位置过滤（自动过滤中国大陆等地区的节点）
    -   正则表达式过滤（支持 IP 和域名过滤）
    -   自动去重（基于 IP:Port 组合）
-   配置灵活：
    -   支持开发和生产环境配置分离
    -   环境变量注入订阅配置
    -   YAML 配置文件
-   日志完善：
    -   详细的过滤原因记录
    -   支持不同日志级别
    -   美化的日志输出

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/sub-collect.git
cd sub-collect

# 安装依赖
pnpm install
```

## 配置

### 基础配置 (default.yaml)

```yaml
# 文件存储配置
storage:
    base_path: 'address'
    files:
        vless: 'vless_api.txt'
        vmess: 'vmess_api.txt'
        trojan: 'trojan_api.txt'
        ssr: 'ssr_api.txt'
        ss: 'ss_api.txt'
        hysteria: 'hysteria_api.txt'
        hysteria2: 'hysteria2_api.txt'

# 日志配置
logger:
    level: 'debug'
    pretty: true

# 过滤规则配置
filter:
    # 正则表达式黑名单
    patterns:
        - '^127\.' # 过滤本地回环地址
        - '^192\.168\.' # 过滤局域网地址
        - 'cf\.090227\.xyz$' # 过滤特定域名
    # 国家/地区代码黑名单
    countryCodes:
        - 'CN' # 中国大陆
```

### 开发环境配置 (development.yaml)

```yaml
# 订阅配置
subs:
    - name: 'vless'
      url: 'https://your-vless-subscription-url'
    - name: 'trojan'
      url: 'https://your-trojan-subscription-url'
```

### 生产环境配置

在 GitHub Actions Secrets 中设置 `SUBS` 环境变量：

```json
{
    "subs": [
        {
            "name": "vless",
            "url": "https://your-vless-subscription-url"
        },
        {
            "name": "trojan",
            "url": "https://your-trojan-subscription-url"
        }
    ]
}
```

## 使用方法

### 本地开发

1. 复制并配置开发环境配置：

    ```bash
    cp config/default.example.yaml config/development.yaml
    # 编辑 development.yaml，添加你的订阅地址
    ```

2. 运行开发环境：
    ```bash
    pnpm dev
    ```

### 生产环境

1. Fork 本仓库
2. 在 GitHub 仓库设置中添加 `SUBS` secret
3. GitHub Actions 将自动运行：
    - 每 8 小时自动更新一次
    - 可以手动触发更新
    - 自动提交更新的节点文件

## 自动化

GitHub Actions 工作流程会：

-   定时（每 8 小时）运行更新
-   支持手动触发更新
-   自动提交更新的节点文件
-   使用环境变量中的订阅配置

## 注意事项

-   不要将包含真实订阅地址的配置文件提交到 Git
-   确保 `development.yaml` 已添加到 `.gitignore`
-   生产环境必须配置 `SUBS` 环境变量
-   IP 查询服务可能有请求限制，已实现自动限流

## License

MIT


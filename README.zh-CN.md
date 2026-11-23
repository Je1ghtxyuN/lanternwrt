# LanternWrt

面向 OpenWrt 的自托管 WebUI。在浏览器查看接口、流量和路由器资源，内置英文和简体中文。

[English](README.md) · [MIT 许可证](LICENSE)

## 功能

- 查看活动接口、DHCP 租约、运行时间、CPU、内存和存储。
- 查看各接口的 RX/TX、IPv4 和 IPv6 地址、设备与网桥成员图、以太网载波与协商速率，以及路由。
- 查看 Wi-Fi 射频、信道和频率、AP／STA 模式。固件提供 iwinfo 时，可查看已关联站点的信号与物理层速率。
- 查看 DHCP／DNS 配置和防火墙规则，搜索 IPv4 DHCP 租约。
- 可选编辑现有 Wi-Fi AP、受支持的接口、DHCP 地址池和上游 DNS，管理 IPv4 端口转发与 IPv4／IPv6 静态路由。
- 配置需确认才会保留。未确认的更改由 OpenWrt rpcd 自动回退。

LanternWrt 运行在独立主机，通过 SSH 和 ubus 与 OpenWrt 通信。接口名称和无线能力由设备返回。路由器模式默认只读。

[GitHub 发布版本](https://github.com/Je1ghtxyuN/lanternwrt/releases)

## 快速开始

演示模式需要 Python 3.10 或更新版本。连接路由器还需要 OpenSSH。

```sh
git clone https://github.com/Je1ghtxyuN/lanternwrt.git
cd lanternwrt
python3 -m lanternwrt.server
```

打开 <http://127.0.0.1:8787/> 查看演示。

## 连接 OpenWrt

先设置 SSH 主机别名和公钥认证，核实主机密钥，再确认 `ssh -o BatchMode=yes openwrt ubus call system board` 能成功执行。

```sh
LANTERN_SSH_TARGET=openwrt python3 -m lanternwrt.server --router
```

`LANTERN_SSH_TARGET` 可填写 SSH 别名或 `user@host`。如需单独的 SSH 配置文件，设置 `LANTERN_SSH_CONFIG`。SSH 账户需要能执行面板使用的 ubus 查询。固件缺少相应能力时，个别区域可能无法显示。

服务默认监听回环地址。部署在另一台主机时，可保留该监听方式，通过 SSH 转发访问：

```sh
ssh -N -L 8787:127.0.0.1:8787 dashboard-host
```

凡能访问后端的客户端都可以读取网络数据，并使用已开启的写入功能。请将后端限制在私有访问范围内。通过带访问认证的反向代理访问时，保留对外的 Host 请求头，并将 `LANTERN_ORIGIN` 设为对外的完整 HTTP(S) origin，末尾不加斜线。

### Docker

```sh
docker build -t lanternwrt .
docker run --rm -p 127.0.0.1:8787:8787 lanternwrt
```

连接路由器时，在镜像名后添加 `--router`，通过 Docker 的 `-e` 设置 `LANTERN_SSH_TARGET` 和 `LANTERN_SSH_CONFIG=/ssh/config`。将专用 SSH 配置、已核验的主机公钥文件和专用私钥只读挂载至 `/ssh`。容器使用 UID 10001，相关文件需要可由该 UID 读取，SSH 配置中应填写容器内的明确路径。

使用 Dropbear 进行只读部署时，可以[将监控密钥限制为仅执行状态采集器](docs/read-only-ssh.md)。

### 可选开启配置写入

设置 `LANTERN_ENABLE_WRITES=1` 后可修改配置。部署主机的 SSH 身份需要有权创建 rpcd 会话并暂存 UCI 选项。只允许执行采集器的专用密钥无法执行写入。

| 页面 | 支持的操作 |
| --- | --- |
| 接口 | 编辑现有的 IPv4／IPv6 静态地址、DHCP、DHCPv6 和 PPPoE 接口 |
| Wi-Fi | 修改现有 AP 的 SSID、密码和启用状态 |
| DHCP / DNS | 调整现有 IPv4 地址池和租期，设置上游 DNS 服务器 IP |
| 防火墙 | 新增、编辑、删除 IPv4 TCP／UDP 端口转发 |
| 路由 | 新增、编辑、删除 IPv4 和 IPv6 静态路由 |

应用配置后，检查是否生效，再点击「保留更改」，也可以主动「回退」。如果管理连接断开而无法确认，rpcd 会在 60 秒后自动回退。修改正在使用的 Wi-Fi 时，建议通过有线链路管理。

## 兼容性与开发

已在运行 Kwrt 25.12.0 的 360 T7 和运行 OpenWrt 25.12.6 的 x86/64 虚拟机上验证只读采集。Kwrt 上验证了状态采集、只读保护和独立 Linux Docker 容器的重启恢复，配置写入在 x86/64 虚拟机上验证。其他固件的 ubus 对象与 DHCP 租约格式可能不同。

```sh
python3 -m unittest discover -s tests
node --check lanternwrt/static/app.js
```

## 许可证

[MIT](LICENSE)。

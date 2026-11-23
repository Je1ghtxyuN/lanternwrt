# LanternWrt

面向 OpenWrt 的自托管 WebUI。在浏览器查看接口、流量和路由器资源，内置英文和简体中文。

[English](README.md) · [MIT 许可证](LICENSE)

## 功能

- 查看活动接口、DHCP 租约、运行时间、CPU、内存和存储。
- 查看各接口的 RX/TX、IPv4 和 IPv6 地址、设备与网桥成员图、以太网载波与协商速率，以及路由。
- 查看 Wi-Fi 射频、信道和频率、AP／STA 模式。固件提供 iwinfo 时，可查看已关联站点的信号与物理层速率。
- 查看 DHCP／DNS 配置和防火墙规则，搜索 IPv4 DHCP 租约。
- 可选编辑现有 Wi-Fi AP 的 SSID 和密码，通过 OpenWrt rpcd 在未确认时自动回退。

LanternWrt 运行在独立主机，通过 SSH 和 ubus 读取路由器。接口名称和无线能力由设备返回。当前是早期版本，接口、DHCP／DNS、防火墙和路由页面暂时只读。

[Beta 版本](https://github.com/Je1ghtxyuN/lanternwrt/releases/tag/v0.1.0-beta) 可用于监控和试用。

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

### 可选开启 Wi-Fi 写入

设置 `LANTERN_ENABLE_WRITES=1` 后可编辑现有的 AP。读写均使用部署主机的 SSH 身份。固件需要支持相应的 rpcd 会话和 UCI 方法，并允许运行临时 UCI 会话。应用后应在回退窗口结束前明确确认。修改当前使用的 Wi-Fi 时，建议通过有线链路管理。

## 兼容性与开发

已在运行 Kwrt 25.12.0 的 360 T7 和运行原版 OpenWrt 25.12.6 的 x86/64 虚拟机上验证只读采集。Kwrt 上验证了状态采集、只读保护以及独立 Linux Docker 容器的重启恢复，x86/64 虚拟机用于有线状态采集测试。演示和自动化测试无需连接路由器。其他 OpenWrt 构建的 ubus 对象与 DHCP 租约格式可能不同，真实设备写入仍属实验功能。

```sh
python3 -m unittest discover -s tests
node --check lanternwrt/static/app.js
```

## 许可证

[MIT](LICENSE)。

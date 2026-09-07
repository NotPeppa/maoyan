# 票候

本地运行的猫眼演出票务状态监控。项目使用 SQLite 文件保存监控数据，提供管理员登录，并在票态变化时通过 WxPusher 发出通知。

## 准备配置

需要 Node.js 22.13 或更高版本。

```bash
cd site
npm install
cp .env.example .env.local
```

编辑 `.env.local`：

- `AUTH_USERNAME`：登录账号
- `AUTH_PASSWORD`：登录密码，请改为强密码
- `SESSION_SECRET`：至少 32 个字符的随机字符串
- `SQLITE_PATH`：SQLite 文件位置，默认 `./data/maoyan.db`
- `WXPUSHER_APP_TOKEN`：WxPusher 应用 Token
- `WXPUSHER_UIDS`：接收人的 UID，多个值使用英文逗号分隔
- `WXPUSHER_TOPIC_IDS`：可选，Topic ID，多个值使用英文逗号分隔

WxPusher 需要先在[官方后台](https://wxpusher.zjiecode.com/admin/main/app/appToken)创建应用并取得 AppToken，再让接收人关注应用以取得 UID。Token 和 UID 不要提交到仓库。

## 启动

SQLite 表会在第一次运行时自动创建，也可以先显式初始化：

```bash
npm run db:init
npm run dev
```

打开 <http://localhost:3000> 并使用 `.env.local` 中的账号密码登录。

页面打开时每 60 秒检查一次。若希望关闭浏览器后仍持续检查，在另一个终端运行：

```bash
npm run monitor
```

后台进程直接读写同一个 SQLite 文件，不依赖网站 API 或登录 Cookie。生产运行时建议使用 systemd、Docker Compose 或进程管理器同时托管 `npm start` 与 `npm run monitor`。

## 通知规则

按钮文案、可购标记、`saleStatus` 或 `ticketStatus` 任一项发生变化时，会写入状态历史并发送 WxPusher 通知。首次添加只记录初始状态，不发送变化通知；推送失败会记入历史，但不会覆盖猫眼状态检查结果。

- `立即购票`：判定为可购
- `缺货登记`：判定为无票，继续监控
- 其他文案：原样展示，不误报为可购

本项目只读取公开详情状态，不执行登录猫眼、下单或抢票操作。请合理设置检查频率，并遵守目标网站的服务条款。

# QR Lite Edge · 本地二维码工具

基于 [QR Lite](https://github.com/monyxie/qr-lite) 修改的浏览器扩展，主要面向 Microsoft Edge。使用随扩展打包的 OpenCV WASM 和 WeChat QRCode 模型离线识别二维码，也保留二维码生成与本地历史记录功能。

## 功能

- 右键网页图片直接识别，其他网页区域右键进入框选扫描。
- 点击扩展识别当前页面可见区域，或粘贴截图、拖入图片、选择本地图片。
- 同一图片识别多个二维码，显示编号框并切换结果，复制或打开当前选择的内容。
- 保留上游二维码生成、摄像头扫描和历史记录功能。

## 本地构建

建议 Node.js 22 或更新版本，使用 pnpm 9.15.1。如本机 pnpm 版本不同，可用 `npx --yes pnpm@9.15.1` 代替 `pnpm`。

```powershell
pnpm install --frozen-lockfile
pnpm build:edge
```

生成的扩展在 `dist/edge/`。OpenCV WASM 和模型已包含在源码中，普通构建不需要重新编译 OpenCV，也不需要外部识别 API Key。

## 安装与使用

1. Edge 打开 `edge://extensions`，开启开发人员模式。
2. 点击“加载解压缩的扩展”，选择 `dist/edge/`，将扩展固定到工具栏。
3. 在图片上右键选择“识别二维码”，或打开扩展选择其他识别方式。
4. 多码图片可点击编号框或对应结果，复制或打开所选内容。

修改并重新构建后，需要在扩展管理页重新加载，并刷新目标网页。Chrome 可尝试加载同一构建；本地浏览器验证主要使用 Edge。

## 验证

```powershell
pnpm lint
pnpm build:edge
pnpm test:edge
```

浏览器测试默认寻找 Windows 的 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`。其他安装位置或平台可先设置 `EDGE_PATH` 环境变量。测试使用临时浏览器配置，样本与截图输出到被忽略的 `.local/edge-test/`。

测试覆盖多码识别、标记和结果切换、复制、本地文件、粘贴/拖放事件及页面截图框选等场景；原生右键菜单点击仍需人工验收。

## 目录

```text
src/               扩展源码、图标、国际化资源
src/opencv/        运行所需的 WASM 和二维码模型
webpack/           构建辅助工具
scripts/           本地验证与上游维护脚本
opencv/            上游 OpenCV 自定义编译脚本
promo/             上游宣传资源，非本地测试截图
docs/              上游来源与原始文档
```

上游 Firefox 构建和发布脚本继续保留作为参考，详见 docs/upstream/README.md；此整理版以 pnpm 的 Edge 构建为主，不启用上游自动发布工作流。

## 隐私与限制

二维码解码在本机完成，不上传图片到识别服务。读取网页原图和点击“打开链接”仍可能产生正常网络访问；历史记录保存在扩展本地存储中，可在设置中关闭或清空。详见 [PRIVACY.md](PRIVACY.md)。

页面截图仅包含可见区域。浏览器内部页面与扩展商店等受保护页面无法注入框选工具，可截图后粘贴；跨域图片读取失败时会尝试使用可见截图。模糊、遮挡或过小的码不保证识别。

## 许可证与来源

QR Lite 源码沿用 [MIT](LICENSE)，原作者为 Mony Xie。预编译识别引擎及模型的来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，本地修改见 [docs/UPSTREAM.md](docs/UPSTREAM.md)。

## 验证记录

本次整理的测试结果、已知检查问题和验证范围见 [docs/VALIDATION.md](docs/VALIDATION.md)。GitHub 工作流会在推送后执行构建检查，不自动发布。

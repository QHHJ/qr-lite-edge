# 第三方来源

## QR Lite

- https://github.com/monyxie/qr-lite
- 作者：Mony Xie
- 项目声明的许可证：MIT，见根目录 LICENSE。
- 本地修改保留原作者署名；源码基线与修改说明见 docs/UPSTREAM.md。

## OpenCV 与 WeChat QRCode

- OpenCV：https://github.com/opencv/opencv
- OpenCV contrib：https://github.com/opencv/opencv_contrib
- WeChat QRCode 模型来源：https://github.com/WeChatCV/opencv_3rdparty/tree/wechat_qrcode
- src/opencv/ 中的 JavaScript、WASM 及模型来自上游 QR Lite 的预编译资源，未在本次整理中重编译或替换。
- opencv/build_opencv_wasm.sh 的源码版本参数为 OpenCV / opencv_contrib 4.11.0；这是重建脚本的版本参数，不是对既有二进制的独立版本鉴定。
- 相关组件的许可证独立于本项目的 MIT 许可证；随附文本保存在 licenses/ 中。

## JavaScript 依赖

依赖版本与完整性记录在 pnpm-lock.yaml 中，包括 Preact、ZXing 等。各依赖保留自身许可证；分发构建产物时应保留依赖提供的许可证标注文件。

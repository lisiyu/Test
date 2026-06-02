# Test Extension

这是一个浏览器扩展的最小原型，支持：

- 在页面 A 可视化选择字段（CSS selector）并保存为映射
- 在页面 A 右键“Send to target”捕获字段，再根据目标类型打开页面 B 或调用 API
- 在页面 B 自动或通过右键“Fill fields”填充表单（Web 模式下）
- 通过 `Options` 页面配置 Page A URL、Page B URL 或 API 目标、字段映射与凭证

快速测试步骤：

1. 在浏览器中加载扩展（指向 `apps/extension/dist`，开发者模式）。
2. 打开 `Options`，配置 Page A URL、目标类型（Web 或 API）以及至少一条映射（fieldA, selectorA, selectorB）。保存。
3. 在 Page A 上右键选择 `Send to target`。扩展会尝试捕获数据并根据目标类型打开页面 B 或调用 API。

注意：当前文件为 TypeScript 源代码，需在真实发布前编译为 JavaScript。建议执行以下命令来构建扩展并在浏览器中加载 `apps/extension/dist`：

```bash
cd apps/extension
npm install
npm run build
```

构建脚本使用 `esbuild`，会把编译产物输出到 `apps/extension/dist`，并生成一个针对 dist 的 `manifest.json`。

在 `Options` 页面中，你现在可以分别配置 Page A 和 Page B 的登录地址、用户名/密码或证书凭证，以及自动登录选项。配置完成后，打开对应登录页面即可让扩展尝试自动填写并提交登录表单。

## Beta Release

已发布第一个 beta 版本：v0.1.0-beta

- 下载地址与发行说明见：https://github.com/lisiyu/Test/releases/tag/v0.1.0-beta
- 使用方式：将 `apps/extension/dist` 目录作为扩展加载到 Chrome（开发者模式）。

如果需要我把发布的二进制（dist）直接打包并上传到其他位置，或创建安装脚本，我也可以继续处理。
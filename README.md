# Test Extension

这是一个浏览器扩展的最小原型，支持：

- 在页面 A 可视化选择字段（CSS selector）并保存为映射
- 在页面 A 右键“Send to Web B”捕获字段并打开页面 B
- 在页面 B 自动或通过右键“Fill fields”填充表单
- 通过 `Options` 页面配置 Page A/B URL、字段映射与凭证

快速测试步骤：

1. 在浏览器中加载扩展（指向 `apps/extension/src`，开发者模式）。
2. 打开 `Options`，配置 Page A/ Page B URL 以及至少一条映射（fieldA, selectorA, selectorB）。保存。
3. 在 Page A 上右键选择 `Send to Web B`。扩展会尝试捕获并打开 Page B，Page B 会尝试自动填充。

注意：当前文件为 TypeScript 源代码，需在真实发布前编译为 JavaScript。manifest 中使用的路径为源码路径，视构建流程可调整为 `dist/` 输出。
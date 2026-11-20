/**
 * 宿主半边。页面与入口都在 client.js 里，这里先留空。
 *
 * 什么时候需要动它：
 *   · 页面要持久化（状态文件 + 只读路由），
 *   · 助手也要能调用同一批能力（ctx.tools.register）。
 * 每条资源都用 ctx.effect / ctx.on 注册并返回清理函数。
 */

export function apply() {}

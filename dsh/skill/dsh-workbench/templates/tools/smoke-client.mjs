/**
 * 渲染冒烟：用假 React 把 client.js 的组件树展开一遍。
 *
 * 为什么需要：浏览器半边的异常会被页面加载器吞掉，表现只是「点了图标一片空白」。
 * 改完页面先跑这个，再去刷新浏览器。
 *
 * 用法：node tools/smoke-client.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, '..', 'client.js'), 'utf8')

// ── 假 window / document：模块只在加载期碰这两个 ─────────────────────
let definition = null
const fakeWindow = { __ModuleLoader__: { load: (def) => { definition = def } } }
const fakeDocument = {
  createElement: () => ({ dataset: {}, textContent: '', parentNode: null }),
  head: {
    appendChild(el) { el.parentNode = fakeDocument.head; return el },
    removeChild(el) { el.parentNode = null; return el },
  },
}
new Function('window', 'document', source)(fakeWindow, fakeDocument)
if (!definition) fail('client.js 没有调用 window.__ModuleLoader__.load')

// ── 假 React：createElement + useState（分区由外部变量指定）──────────
let forcedTab = 'toolbox'
const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat() }
  },
  useState(initial) {
    return [forcedTab ?? initial, (value) => { forcedTab = value }]
  },
}

// ── 假 ctx ──────────────────────────────────────────────────────────
const registrations = {}
const effects = []
const ctx = {
  get(name) {
    if (name === 'slots') {
      return {
        inject: (slot, thunk) => { const result = thunk(); registrations[slot] = result; return result },
        register: (options, component) => Object.assign({ component }, options),
      }
    }
    if (name === 'layout') return { selectPanel: () => {} }
    return undefined
  },
  effect: (fn, label) => effects.push({ fn, label }),
  logger: { warn: (msg) => fail('挂载期 warn：' + msg), error: (msg) => fail('挂载期 error：' + msg) },
}

const factory = definition.factory || definition
const plugin = factory((id) => {
  if (id === 'react') return React
  throw new Error('意外 require：' + id)
})
plugin.apply(ctx)

// ── 断言：入口、页面、分区 ──────────────────────────────────────────
expect(definition.id === 'my-workbench', '模块 id 应为包名')
for (const slot of ['sidebar.panellist', 'main', 'conversation.input.left']) {
  expect(!!registrations[slot], '未注册入口：' + slot)
}
expect(registrations['sidebar.panellist'].id === 'my-workbench', '侧栏 id 应等于主面板键位')
expect(registrations.main.key === 'my-workbench', 'main 键位错误')
expect(effects.length >= 1, '没有注册 ctx.effect 清理函数')

texts(registrations['sidebar.panellist'].component({ size: 18, active: true }))
expect(texts(registrations['conversation.input.left'].component()).join('').includes('工作台'), '输入框入口缺文案')

const page = registrations.main.component
const cases = [
  ['toolbox', ['工具箱', 'API 调试', 'JSON 格式化', '时间戳转换', '待实现']],
  ['chat', ['AI 对话', '发送', '占位']],
  ['quick', ['快速打开', '监控大盘', 'grafana.example.com']],
  ['todo', ['待办', '把占位换成真实现', '测试']],
]
for (const [tab, expected] of cases) {
  forcedTab = tab
  const joined = texts(page({})).join('\n')
  for (const fragment of expected) {
    expect(joined.includes(fragment), `分区 ${tab} 缺少「${fragment}」\n—— 实际文案：${joined.slice(0, 700)}`)
  }
  expect(joined.includes('我的工作台'), `分区 ${tab} 缺页头标题`)
  expect(joined.includes('占位版本'), `分区 ${tab} 缺页脚说明`)
}
forcedTab = 'toolbox'
expect(texts(page({})).join('\n').includes('3 个工具'), '工具数量文案不对')
forcedTab = 'quick'
expect(texts(page({})).join('\n').includes('2 个入口'), '入口数量文案不对')
forcedTab = 'todo'
expect(texts(page({})).join('\n').includes('2 项未完成'), '待办数量文案不对')

console.log('渲染冒烟通过：3 个入口 + 4 个分区，关键文案与数量都在。')

// ── 小工具 ──────────────────────────────────────────────────────────
function texts(node, out = []) {
  if (node === null || node === undefined || node === false) return out
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out }
  if (Array.isArray(node)) { for (const child of node) texts(child, out); return out }
  if (typeof node === 'object') {
    if (typeof node.type === 'function') return texts(node.type(node.props), out)
    if (node.props && typeof node.props.title === 'string') out.push(node.props.title)
    for (const child of node.children || []) texts(child, out)
  }
  return out
}

function expect(condition, message) {
  if (!condition) fail(message)
}

function fail(message) {
  console.error('✗ ' + message)
  process.exit(1)
}

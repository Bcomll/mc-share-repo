/**
 * 浏览器半边：一个主面板页 + 两个入口。
 *
 * 骨架就是三件事：
 *   · `sidebar.panellist` 放图标（id 必须与 `main` 的 key 相同）；
 *   · `main` 放页面本身；
 *   · `conversation.input.left` 放输入框入口（皮肤换掉侧栏时还能点）。
 * 翻页走 `layout.selectPanel(PANEL_ID)`，回对话是 `selectPanel(null)`。
 *
 * 这一版所有控件都是占位；把分区内容换成真实现时，参考 references/roadmap.md 的顺序。
 */

window.__ModuleLoader__.load({
  id: 'my-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'my-workbench'
    const inject = ['slots', 'layout']

    const SECTIONS = [
      { id: 'toolbox', name: '工具箱', hint: '3 个' },
      { id: 'chat', name: 'AI 对话', hint: '占位' },
      { id: 'quick', name: '快速打开', hint: '2 个' },
      { id: 'todo', name: '待办', hint: '2 项' },
    ]

    const TOOLS = [
      { id: 'api', mono: 'API', name: 'API 调试', desc: '发请求、看响应，占位。' },
      { id: 'json', mono: '{}', name: 'JSON 格式化', desc: '格式化、压缩、校验，占位。' },
      { id: 'time', mono: 'TS', name: '时间戳转换', desc: '秒 / 毫秒与本地时间互转，占位。' },
    ]

    const PAGES = [
      { name: '监控大盘', url: 'grafana.example.com' },
      { name: '接口文档', url: 'api-docs.example.com' },
    ]

    const TODOS = [
      { title: '把占位换成真实现', tag: 'P0', due: '本周' },
      { title: '补一条冒烟断言', tag: '测试', due: '无截止' },
    ]

    let layoutRef = null
    let lastTab = 'toolbox'

    function openPanel() {
      try {
        if (layoutRef && typeof layoutRef.selectPanel === 'function') layoutRef.selectPanel(PANEL_ID)
      } catch (error) { /* 翻页失败不影响页面本身 */ }
    }

    function backToChat() {
      try {
        if (layoutRef && typeof layoutRef.selectPanel === 'function') layoutRef.selectPanel(null)
      } catch (error) { /* 同上 */ }
    }

    function Badge(props) {
      return h('span', { className: 'wb-badge' }, props.text)
    }

    /** 侧栏图标：owner 传 { size, active }。 */
    function SidebarIcon(props) {
      const size = (props && props.size) || 18
      const active = !!(props && props.active)
      return h('svg', {
        width: size, height: size, viewBox: '0 0 20 20', 'aria-hidden': 'true',
        style: { opacity: active ? 1 : 0.82 },
      },
        h('rect', {
          x: 2.4, y: 3.6, width: 15.2, height: 12.8, rx: 2.6,
          fill: 'none', stroke: 'currentColor', strokeWidth: active ? 1.9 : 1.5,
        }),
        h('path', {
          d: 'M2.4 8.2h15.2M7.2 8.2v8.2',
          fill: 'none', stroke: 'currentColor', strokeWidth: active ? 1.7 : 1.4,
        }))
    }

    /** 输入框入口。 */
    function ComposerEntry() {
      return h('button', {
        type: 'button', className: 'wb-entry', title: '打开工作台', 'aria-label': '打开工作台',
        onClick: openPanel,
      },
        h('span', { 'aria-hidden': 'true' }, '▦'),
        h('span', null, '工作台'))
    }

    function navButtons(tab, choose) {
      return SECTIONS.map(function (item) {
        return h('button', {
          key: item.id,
          type: 'button',
          className: tab === item.id ? 'wb-nav-btn on' : 'wb-nav-btn',
          onClick: function () { choose(item.id) },
        },
          h('span', { className: 'wb-nav-name' }, item.name),
          h('span', { className: 'wb-nav-hint' }, item.hint))
      })
    }

    function toolboxSection() {
      const cards = TOOLS.map(function (tool) {
        return h('article', { className: 'wb-card', key: tool.id },
          h('div', { className: 'wb-card-top' },
            h('span', { className: 'wb-mono' }, tool.mono),
            h('span', { className: 'wb-card-name' }, tool.name),
            h(Badge, { text: '待实现' })),
          h('p', { className: 'wb-card-desc' }, tool.desc))
      })
      return h('section', { className: 'wb-sec' },
        h('div', { className: 'wb-sec-head' },
          h('h2', { className: 'wb-sec-title' }, '工具箱'),
          h('span', { className: 'wb-sec-meta' }, TOOLS.length + ' 个工具 · 全部待实现')),
        h('div', { className: 'wb-grid' }, cards))
    }

    function chatSection() {
      return h('section', { className: 'wb-sec' },
        h('div', { className: 'wb-sec-head' },
          h('h2', { className: 'wb-sec-title' }, 'AI 对话'),
          h('span', { className: 'wb-sec-meta' }, '未接入模型，仅占位')),
        h('div', { className: 'wb-bubble' }, '这里是 AI 对话占位区。'),
        h('div', { className: 'wb-bubble me' }, '（占位）帮我把这段 JSON 格式化一下。'),
        h('div', { className: 'wb-composer' },
          h('input', { className: 'wb-input', type: 'text', readOnly: true, placeholder: '向助理提问……（占位）' }),
          h('button', { type: 'button', className: 'wb-send', disabled: true }, '发送')))
    }

    function quickSection() {
      const rows = PAGES.map(function (page) {
        return h('div', { className: 'wb-row', key: page.name },
          h('span', { className: 'wb-row-name' }, page.name),
          h('span', { className: 'wb-row-url' }, page.url),
          h(Badge, { text: '待实现' }))
      })
      return h('section', { className: 'wb-sec' },
        h('div', { className: 'wb-sec-head' },
          h('h2', { className: 'wb-sec-title' }, '快速打开'),
          h('span', { className: 'wb-sec-meta' }, PAGES.length + ' 个入口 · 网址均为占位')),
        h('div', { className: 'wb-rows' }, rows))
    }

    function todoSection() {
      const rows = TODOS.map(function (todo) {
        return h('div', { className: 'wb-row', key: todo.title },
          h('span', { className: 'wb-check', 'aria-hidden': 'true' }),
          h('span', { className: 'wb-row-name' }, todo.title),
          h('span', { className: 'wb-tag' }, todo.tag),
          h('span', { className: 'wb-due' }, todo.due))
      })
      return h('section', { className: 'wb-sec' },
        h('div', { className: 'wb-sec-head' },
          h('h2', { className: 'wb-sec-title' }, '待办'),
          h('span', { className: 'wb-sec-meta' }, TODOS.length + ' 项未完成')),
        h('div', { className: 'wb-rows' }, rows))
    }

    function WorkbenchPage() {
      const state = React.useState(lastTab)
      const tab = state[0]
      const choose = function (id) { lastTab = id; state[1](id) }
      let body = toolboxSection()
      if (tab === 'chat') body = chatSection()
      else if (tab === 'quick') body = quickSection()
      else if (tab === 'todo') body = todoSection()
      return h('div', { className: 'wb-root' },
        h('header', { className: 'wb-head' },
          h('span', { className: 'wb-title' }, '我的工作台'),
          h('span', { className: 'wb-grow' }),
          h(Badge, { text: '占位' }),
          h('button', { type: 'button', className: 'wb-btn', onClick: backToChat }, '回到对话')),
        h('div', { className: 'wb-body' },
          h('nav', { className: 'wb-nav', 'aria-label': '工作台分区' }, navButtons(tab, choose)),
          h('div', { className: 'wb-main' }, body)),
        h('footer', { className: 'wb-foot' }, '占位版本：分区切换可用，按钮与输入框不触发任何动作。'))
    }

    const CSS = [
      '.wb-root{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;',
      '  background:var(--dsw-alias-bg-base,#0f1319);color:var(--dsw-alias-label-primary,#e6edf3);',
      '  font:13px/1.55 ui-sans-serif,system-ui,"PingFang SC","Microsoft YaHei",sans-serif}',
      '.wb-head{flex:none;display:flex;align-items:center;gap:10px;padding:10px 16px;',
      '  border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));',
      '  background:var(--dsw-alias-bg-layer-1,#151b23)}',
      '.wb-title{font-size:14px;font-weight:600}',
      '.wb-grow{flex:1}',
      '.wb-badge{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:999px;',
      '  font-size:10.5px;line-height:1;color:var(--dsw-alias-label-secondary,#93a3b4);',
      '  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07));',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}',
      '.wb-btn{flex:none;height:26px;padding:0 11px;border-radius:7px;font:inherit;font-size:12px;cursor:pointer;',
      '  color:var(--dsw-alias-label-secondary,#9fb0c0);background:transparent;',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14))}',
      '.wb-btn:hover{color:var(--dsw-alias-label-primary,#e6edf3)}',
      '.wb-body{flex:1;min-height:0;display:flex}',
      '.wb-nav{flex:none;width:176px;padding:10px 8px;display:flex;flex-direction:column;gap:2px;overflow:auto;',
      '  border-right:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));',
      '  background:var(--dsw-specific-sidebar-fill,#11171f)}',
      '.wb-nav-btn{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;',
      '  background:transparent;color:var(--dsw-alias-label-secondary,#93a3b4);font:inherit;font-size:12.5px;',
      '  cursor:pointer;text-align:left}',
      '.wb-nav-btn:hover{color:var(--dsw-alias-label-primary,#e6edf3)}',
      '.wb-nav-btn.on{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.09));color:var(--dsw-alias-label-primary,#e6edf3);',
      '  box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,#4f9cf9)}',
      '.wb-nav-name{flex:1;min-width:0}',
      '.wb-nav-hint{flex:none;font-size:10.5px;opacity:.72}',
      '.wb-main{flex:1;min-width:0;overflow:auto;padding:16px 18px 22px}',
      '.wb-sec{display:flex;flex-direction:column;gap:12px}',
      '.wb-sec-head{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}',
      '.wb-sec-title{margin:0;font-size:13.5px;font-weight:600}',
      '.wb-sec-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary,#8fa3b8)}',
      '.wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:10px}',
      '.wb-card{display:flex;flex-direction:column;gap:7px;padding:11px 12px;border-radius:10px;',
      '  background:var(--dsw-alias-bg-layer-1,#151b23);',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}',
      '.wb-card-top{display:flex;align-items:center;gap:8px;min-width:0}',
      '.wb-mono{flex:none;min-width:28px;height:24px;padding:0 5px;border-radius:6px;display:inline-flex;',
      '  align-items:center;justify-content:center;font:600 10.5px/1 ui-monospace,Consolas,monospace;',
      '  color:var(--dsw-alias-brand-primary,#4f9cf9);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07))}',
      '.wb-card-name{flex:1;min-width:0;font-size:12.5px;font-weight:600}',
      '.wb-card-desc{margin:0;font-size:11.5px;color:var(--dsw-alias-label-secondary,#93a3b4)}',
      '.wb-bubble{max-width:600px;padding:9px 12px;border-radius:10px;font-size:12.5px;',
      '  background:var(--dsw-alias-bg-layer-1,#151b23);',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}',
      '.wb-bubble.me{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07))}',
      '.wb-composer{display:flex;gap:8px;align-items:center;padding:8px;border-radius:10px;',
      '  background:var(--dsw-alias-bg-layer-1,#151b23);',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12))}',
      '.wb-input{flex:1;min-width:0;padding:6px 8px;border:0;border-radius:6px;background:transparent;',
      '  color:inherit;font:inherit;font-size:12.5px;outline:none}',
      '.wb-send{flex:none;height:26px;padding:0 12px;border-radius:7px;font:inherit;font-size:12px;',
      '  color:var(--dsw-alias-label-secondary,#8fa3b8);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07));',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));cursor:not-allowed}',
      '.wb-rows{border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1,#151b23);',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}',
      '.wb-row{display:flex;align-items:center;gap:9px;padding:9px 12px;',
      '  border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.07))}',
      '.wb-row:first-child{border-top:0}',
      '.wb-row-name{flex:none;font-size:12.5px;font-weight:500}',
      '.wb-row-url{flex:1;min-width:0;font:11px ui-monospace,Consolas,monospace;',
      '  color:var(--dsw-alias-label-secondary,#8fa3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.wb-tag{flex:none;font-size:10.5px;padding:1px 7px;border-radius:5px;',
      '  color:var(--dsw-alias-label-secondary,#93a3b4);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06))}',
      '.wb-due{flex:none;font-size:10.5px;color:var(--dsw-alias-label-secondary,#8fa3b8)}',
      '.wb-check{flex:none;width:15px;height:15px;border-radius:4px;',
      '  border:1.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.24))}',
      '.wb-foot{flex:none;padding:6px 16px;font-size:11px;color:var(--dsw-alias-label-secondary,#8fa3b8);',
      '  border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1));',
      '  background:var(--dsw-alias-bg-layer-1,#151b23)}',
      '.wb-entry{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:7px;',
      '  font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;',
      '  color:var(--dsw-alias-label-secondary,#9fb0c0);background:transparent;',
      '  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14))}',
      '.wb-entry:hover{color:var(--dsw-alias-label-primary,#e6edf3)}',
    ].join('\n')

    function installStyles() {
      const style = document.createElement('style')
      style.dataset.plugin = 'my-workbench'
      style.textContent = CSS
      document.head.appendChild(style)
      return function () { if (style.parentNode) style.parentNode.removeChild(style) }
    }

    function apply(ctx) {
      const removeStyles = installStyles()
      const get = function (name) {
        try { return ctx.get ? ctx.get(name) : undefined } catch (error) { return undefined }
      }
      layoutRef = get('layout') || null
      const slots = get('slots')

      if (slots && typeof slots.inject === 'function' && typeof slots.register === 'function') {
        try {
          slots.inject('sidebar.panellist', function () {
            return slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 35, label: '我的工作台' }, SidebarIcon)
          })
          slots.inject('main', function () {
            return slots.register({ name: 'main', key: PANEL_ID }, WorkbenchPage)
          })
          slots.inject('conversation.input.left', function () {
            return slots.register({ name: 'conversation.input.left', id: 'my-workbench-open', order: 35 }, ComposerEntry)
          })
        } catch (error) {
          if (ctx.logger && ctx.logger.warn) ctx.logger.warn('my-workbench: 入口注册失败：' + (error && error.message))
        }
      }

      ctx.effect(function () {
        return function () { removeStyles(); layoutRef = null }
      }, 'my-workbench: teardown')
    }

    return { inject, apply, PANEL_ID }
  },
})

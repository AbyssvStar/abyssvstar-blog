export type Theme = 'dark' | 'light'

const KEY = 'admin-theme'

/** 读当前生效的主题。默认值由 index.html 里的内联脚本决定（深色，或跟随系统）。 */
export function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // 隐私模式下 localStorage 会抛异常。主题这次生效就行，不值得打断用户
  }
}

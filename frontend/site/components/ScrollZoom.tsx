/**
 * 列表封面的外壳。
 *
 * 这里**不做**裁剪、也不做滚动视差：图片从一开始就完整显示，
 * 悬停时整张放大并抬起投影 —— 这样就不会出现"被裁掉的一圈突然露出来"的跳变。
 * （之前那版是裁剪 + 视差 + 缩放三层，效果更花，但跳变无法避免。）
 */
export function ScrollZoom({ children }: { children: React.ReactNode }) {
  return <span className="scroll-zoom">{children}</span>
}
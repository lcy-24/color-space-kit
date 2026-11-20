/**
 * color-kit
 * 颜色转换与计算：hex / rgb / hsl / hsv 互转、WCAG 对比度、混合、明暗判断，零依赖、全 TypeScript。
 *
 * 从 SaaS 平台的主题色、图表配色、无障碍（a11y）对比度校验场景提炼。
 * 三个高频坑：
 *  1. #RGB 简写要展开成 #RRGGBB 才能解析
 *  2. WCAG 对比度要先做 gamma 线性化，不能直接拿 0-255 算
 *  3. 对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大字）是 WCAG 的硬门槛
 */

export interface RGB {
  r: number
  g: number
  b: number
  a?: number
}

export interface HSL {
  h: number
  s: number
  l: number
  a?: number
}

export interface HSV {
  h: number
  s: number
  v: number
  a?: number
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

/** 解析 #RGB / #RRGGBB / #RRGGBBAA 为 RGB（0-255） */
export function hexToRgb(hex: string): RGB {
  let s = hex.trim().replace(/^#/, '')
  if (s.length === 3 || s.length === 4) {
    // 简写展开：#RGB → #RRGGBB
    s = s
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (s.length !== 6 && s.length !== 8) {
    throw new Error(`无效的 hex 颜色：${hex}`)
  }
  const r = parseInt(s.slice(0, 2), 16)
  const g = parseInt(s.slice(2, 4), 16)
  const b = parseInt(s.slice(4, 6), 16)
  const a = s.length === 8 ? Math.round((parseInt(s.slice(6, 8), 16) / 255) * 100) / 100 : undefined
  return { r, g, b, a }
}

/** RGB → #RRGGBB（丢弃 alpha；需要 alpha 用 {@link rgbToHexA}） */
export function rgbToHex(rgb: RGB): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`.toUpperCase()
}

/** RGB → #RRGGBBAA */
export function rgbToHexA(rgb: RGB): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
  const a = rgb.a === undefined ? 1 : rgb.a
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}${to(Math.round(clamp(a, 0, 1) * 255))}`.toUpperCase()
}

/** RGB(0-255) → HSL(h:0-360, s/l:0-100) */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
  }
  return { h: round1(h), s: round1(s * 100), l: round1(l * 100), a: rgb.a }
}

/** HSL(h:0-360, s/l:0-100) → RGB(0-255) */
export function hslToRgb(hsl: HSL): RGB {
  const h = ((hsl.h % 360) + 360) % 360 / 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100

  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v, a: hsl.a }
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    a: hsl.a,
  }
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl))
}

/** RGB(0-255) → HSV(h:0-360, s/v:0-100) */
export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60
        break
      case g:
        h = ((b - r) / d + 2) * 60
        break
      default:
        h = ((r - g) / d + 4) * 60
    }
  }
  const s = max === 0 ? 0 : d / max
  return { h: round1(h), s: round1(s * 100), v: round1(max * 100), a: rgb.a }
}

/** HSV(h:0-360, s/v:0-100) → RGB(0-255) */
export function hsvToRgb(hsv: HSV): RGB {
  const h = ((hsv.h % 360) + 360) % 360 / 360
  const s = clamp(hsv.s, 0, 100) / 100
  const v = clamp(hsv.v, 0, 100) / 100
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0
  let g = 0
  let b = 0
  switch (i % 6) {
    case 0:
      r = v; g = t; b = p
      break
    case 1:
      r = q; g = v; b = p
      break
    case 2:
      r = p; g = v; b = t
      break
    case 3:
      r = p; g = q; b = v
      break
    case 4:
      r = t; g = p; b = v
      break
    case 5:
      r = v; g = p; b = q
      break
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: hsv.a }
}

/** 0-255 通道做 gamma 线性化（WCAG 相对亮度第一步） */
function linearize(c: number): number {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** WCAG 相对亮度（0-1） */
export function luminance(rgb: RGB): number {
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)
}

/**
 * WCAG 2.x 对比度（1:1 ~ 21:1）。
 * 接受 hex 或 RGB。返回数值（如 4.5 表示 4.5:1）。
 */
export function contrastRatio(a: string | RGB, b: string | RGB): number {
  const la = luminance(typeof a === 'string' ? hexToRgb(a) : a)
  const lb = luminance(typeof b === 'string' ? hexToRgb(b) : b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return round1((lighter + 0.05) / (darker + 0.05))
}

/** 是否满足 WCAG AA 正文对比度（≥ 4.5:1） */
export function isWCAGAA(fg: string | RGB, bg: string | RGB): boolean {
  return contrastRatio(fg, bg) >= 4.5
}

/** 是否为浅色（相对亮度 > 0.5），常用于自动选黑/白文字 */
export function isLight(color: string | RGB): boolean {
  return luminance(typeof color === 'string' ? hexToRgb(color) : color) > 0.5
}

export function isDark(color: string | RGB): boolean {
  return !isLight(color)
}

/**
 * 两个颜色混合。weight 0-1，weight=0 纯 colorA，weight=1 纯 colorB。
 * 支持 alpha 混合。
 */
export function mix(colorA: string | RGB, colorB: string | RGB, weight = 0.5): RGB {
  const a = typeof colorA === 'string' ? hexToRgb(colorA) : colorA
  const b = typeof colorB === 'string' ? hexToRgb(colorB) : colorB
  const w = clamp(weight, 0, 1)
  const alphaA = a.a === undefined ? 1 : a.a
  const alphaB = b.a === undefined ? 1 : b.a
  const outAlpha = alphaA + (alphaB - alphaA) * w
  return {
    r: Math.round(a.r + (b.r - a.r) * w),
    g: Math.round(a.g + (b.g - a.g) * w),
    b: Math.round(a.b + (b.b - a.b) * w),
    a: round1(outAlpha),
  }
}

/** 根据背景色自动推荐文字色（黑/白），保证可读性。threshold 默认 0.5。 */
export function readableText(bg: string | RGB): '#000000' | '#FFFFFF' {
  return isLight(bg) ? '#000000' : '#FFFFFF'
}

/** 生成随机 hex 颜色 */
export function randomHex(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

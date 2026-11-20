# color-space-kit

颜色转换与计算，零依赖、全 TypeScript。hex / rgb / hsl / hsv 互转、WCAG 对比度、混合、明暗判断。从 SaaS 平台的主题色、图表配色、无障碍（a11y）校验场景提炼。

## 安装

```bash
npm install color-space-kit
```

## 快速开始

```ts
import { hexToRgb, rgbToHsl, contrastRatio, isWCAGAA, mix, readableText } from "color-space-kit"

hexToRgb('#336699')         // { r: 51, g: 102, b: 153 }
rgbToHsl({ r: 255, g: 0, b: 0 }) // { h: 0, s: 100, l: 50 }

// WCAG 对比度（权威值：黑/白 = 21，白/蓝 ≈ 8.59）
contrastRatio('#000000', '#ffffff')  // 21
contrastRatio('#ffffff', '#0000ff')  // 8.6

isWCAGAA('#333333', '#ffffff')       // true  （≥ 4.5 达标）

mix('#ff0000', '#0000ff', 0.5)       // 紫色 { r:128, g:0, b:128 }

readableText('#ffffff')              // '#000000'（白底自动选黑字）
```

## API

| 类别 | 函数 |
| --- | --- |
| hex ↔ rgb | `hexToRgb` `rgbToHex` `rgbToHexA` |
| rgb ↔ hsl | `rgbToHsl` `hslToRgb` `hexToHsl` `hslToHex` |
| rgb ↔ hsv | `rgbToHsv` `hsvToRgb` |
| 对比度 | `luminance` `contrastRatio` `isWCAGAA` |
| 辅助 | `mix` `isLight` `isDark` `readableText` `randomHex` |

## ⚠️ 三个必须知道的坑

### 1. `#RGB` 简写要先展开才能解析

`#abc` 是 `#aabbcc` 的简写，直接 `parseInt('ab', 16)` 会得到错误的 171 而不是 170。本库先展开（每个字符翻倍）再解析，且支持 8 位 `#RRGGBBAA` 带 alpha 的写法。

### 2. WCAG 对比度要先做 gamma 线性化

对比度公式里的「相对亮度」**不能**直接拿 0-255 的 RGB 算，要先线性化：

```
c ≤ 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4
```

再按 `0.2126R + 0.7152G + 0.0722B` 加权。跳过这一步算出的对比度是错的。本库 `contrastRatio` 已内置正确公式，可直接用于无障碍验收。

### 3. 对比度 4.5:1 / 3:1 是 WCAG 的硬门槛

- **正文**文字对比度 ≥ **4.5:1**（AA 级）
- **大字**（≥ 18pt 或 14pt 加粗）≥ **3:1**

`isWCAGAA` 帮你校验正文是否达标，做主题色/设计系统时每个配色都该过一遍。

## 实现要点

- 全部用 0-360 / 0-100 的**人类友好范围**（hsl/hsv 的 s/l/v 是百分数，不是 0-1）。
- 返回数值统一 `round1` 到 1 位小数，避免 `0.30000000000000004` 这类噪音。
- `mix` 支持带 alpha 的颜色做插值。

## License

MIT

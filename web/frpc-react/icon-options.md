# 网站图标选项

## 当前图标
✅ 服务器图标 (蓝色渐变背景) - 已设置

## 其他选项

### 1. 网络连接图标
```tsx
// 替换 icon.tsx 中的 SVG
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  <circle cx="12" cy="9" r="2.5"/>
</svg>
```

### 2. 控制面板图标
```tsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <line x1="4" x2="4" y1="21" y2="14"/>
  <line x1="4" x2="4" y1="10" y2="3"/>
  <line x1="12" x2="12" y1="21" y2="12"/>
  <line x1="12" x2="12" y1="8" y2="3"/>
  <line x1="20" x2="20" y1="21" y2="16"/>
  <line x1="20" x2="20" y1="12" y2="3"/>
  <line x1="1" x2="7" y1="14" y2="14"/>
  <line x1="9" x2="15" y1="8" y2="8"/>
  <line x1="17" x2="23" y1="16" y2="16"/>
</svg>
```

### 3. 齿轮设置图标
```tsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
```

### 4. 简单的"R"字母图标（代表Remote）
```tsx
<div style={{
  fontSize: 20,
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
}}>
  R
</div>
```

### 5. 信号塔图标
```tsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="m2 17 10-10 10 10"/>
  <path d="m6 21 6-6 6 6"/>
  <path d="m10 21 2-2 2 2"/>
</svg>
```

## 如何更换图标

1. 打开 `/app/icon.tsx` 文件
2. 替换 `<svg>` 标签内的内容
3. 可选：更改背景颜色或样式
4. 重启开发服务器查看效果

## 颜色方案建议
- 蓝色渐变：`background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'`
- 绿色渐变：`background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'`
- 紫色渐变：`background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'`
- 纯色背景：`background: '#3b82f6'`
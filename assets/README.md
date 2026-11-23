# Assets Directory Structure

## 📁 Cấu trúc thư mục

```
assets/
├── css/
│   ├── common.css    # Styles chung cho tất cả devices
│   ├── desktop.css   # Styles dành riêng cho desktop (≥769px)
│   └── mobile.css    # Styles dành riêng cho mobile/tablet (≤768px)
└── js/
    └── app.js        # JavaScript chính
```

## 📄 CSS Files

### common.css
**Dùng chung cho tất cả devices**

Bao gồm:
- Reset & Base styles
- CSS Variables (`:root`)
- Responsive breakpoints
- Mosaic grid system
- Game tiles (base styles)
- Sidebar (search, login)
- Categories section
- About section
- Footer
- Scrollbar styles

### desktop.css  
**Chỉ load trên màn ≥769px** (`media="(min-width: 769px)"`)

Bao gồm:
- Header tile fixed (desktop)
- Header layouts (vertical < 1920px, horizontal ≥1920px)
- Desktop hover effects (game tiles, category tiles)
- Tablet optimizations (768px - 1279px)

### mobile.css
**Chỉ load trên màn ≤768px** (`media="(max-width: 768px)"`)

Bao gồm:
- Mobile header (sticky pill)
- Ẩn desktop header
- Mobile optimizations:
  - 3 columns grid
  - Smaller gaps/padding
  - Active states thay vì hover
  - Tile overlay luôn hiện
  - Sidebar full width
  - 1-row category scroll
  - Compact footer

## 🔗 Cách sử dụng trong HTML

```html
<head>
    <!-- Common styles: luôn load -->
    <link rel="stylesheet" href="assets/css/common.css">
    
    <!-- Desktop styles: chỉ load khi ≥769px -->
    <link rel="stylesheet" href="assets/css/desktop.css" media="(min-width: 769px)">
    
    <!-- Mobile styles: chỉ load khi ≤768px -->
    <link rel="stylesheet" href="assets/css/mobile.css" media="(max-width: 768px)">
</head>
```

## 🎯 Ưu điểm

1. **Performance**: Browser chỉ load CSS cần thiết cho device type
2. **Maintainability**: Dễ tìm và sửa styles theo device
3. **Scalability**: Dễ thêm breakpoints mới (tablet.css, etc.)
4. **Clean code**: Tách biệt rõ ràng giữa mobile/desktop logic

## 📱 Breakpoints

- **Mobile**: ≤768px (3 columns)
- **Tablet**: 768px - 1279px (5-11 columns)
- **Desktop**: ≥769px (11-17 columns)
- **Large Desktop**: ≥1920px (header 2x1)

## 🚀 Development Tips

- **Sửa common features**: Edit `common.css`
- **Sửa desktop header**: Edit `desktop.css`
- **Sửa mobile header**: Edit `mobile.css`
- **Thêm responsive**: Thêm media queries vào file tương ứng
- **Test**: Dùng Chrome DevTools responsive mode

## 📦 Minify cho Production

```bash
# Minify CSS (optional)
npx cssnano common.css -o common.min.css
npx cssnano desktop.css -o desktop.min.css
npx cssnano mobile.css -o mobile.min.css

# Minify JS (optional)
npx terser app.js -o app.min.js -c -m
```

---
**Version**: 1.0.0  
**Last Updated**: October 8, 2026

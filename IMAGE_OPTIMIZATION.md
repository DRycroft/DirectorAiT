# Image Optimization Guidelines

## Current Images
The following images should be optimized for production:
- `src/assets/feature-ai.jpg`
- `src/assets/feature-audit.jpg`
- `src/assets/feature-secure.jpg`
- `src/assets/hero-board.jpg`

## Recommended Optimizations

### 1. Convert to Modern Formats
- Use WebP for better compression (30-50% smaller than JPEG)
- Provide AVIF as fallback for even better compression
- Keep original JPEGs as final fallback

### 2. Responsive Images
Use srcset for different screen sizes:
```tsx
<img
  src="/images/hero-board.jpg"
  srcSet="
    /images/hero-board-small.webp 640w,
    /images/hero-board-medium.webp 1024w,
    /images/hero-board-large.webp 1920w
  "
  sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
  alt="Board meeting"
  loading="lazy"
/>
```

### 3. Lazy Loading
All images below the fold should use `loading="lazy"`:
```tsx
<img src="/images/feature.webp" alt="Feature" loading="lazy" />
```

### 4. Image Optimization Tools
- **Online**: TinyPNG, Squoosh, ImageOptim
- **CLI**: sharp, imagemin
- **Build time**: vite-plugin-imagemin

### 5. Implementation Example
```tsx
import heroImage from '@/assets/hero-board.jpg';

// With modern picture element
<picture>
  <source srcset={heroImage.replace('.jpg', '.avif')} type="image/avif" />
  <source srcset={heroImage.replace('.jpg', '.webp')} type="image/webp" />
  <img src={heroImage} alt="Hero" loading="lazy" />
</picture>
```

## Current Implementation
- ✅ Lazy loading routes (React.lazy)
- ✅ Code splitting for dashboard widgets
- ✅ Pagination for large lists
- ⚠️ Images need manual optimization (convert JPG → WebP/AVIF)

## Next Steps
1. Run images through compression tool (TinyPNG or Squoosh)
2. Convert to WebP format
3. Update image imports to use modern formats
4. Add responsive image sizes
5. Implement progressive loading placeholders

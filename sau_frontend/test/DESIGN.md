---
name: Pro-SaaS Sentinel
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#74777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#4d6077'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#071d31'
  on-primary-container: '#72869e'
  inverse-primary: '#b4c8e3'
  secondary: '#0060a9'
  on-secondary: '#ffffff'
  secondary-container: '#409eff'
  on-secondary-container: '#003460'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#072100'
  on-tertiary-container: '#3e9609'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#b4c8e3'
  on-primary-fixed: '#071d31'
  on-primary-fixed-variant: '#35485e'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#a2c9ff'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#004881'
  tertiary-fixed: '#9bfa6b'
  tertiary-fixed-dim: '#80dd52'
  on-tertiary-fixed: '#072100'
  on-tertiary-fixed-variant: '#1d5200'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
  sidebar-deep: '#001529'
  sidebar-accent: '#002140'
  status-success: '#67C23A'
  status-warning: '#E6A23C'
  status-danger: '#F56C6C'
  status-info: '#909399'
  platform-douyin: '#F56C6C'
  platform-kuaishou: '#67C23A'
  platform-shipinhao: '#E6A23C'
  platform-xhs: '#909399'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 200px
  sidebar-collapsed: 64px
  gutter: 1.5rem
  margin-page: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

The design system is engineered for a high-end enterprise SaaS environment, specifically tailored for the "找大状" management ecosystem. The brand personality is rooted in **Trust, Efficiency, and Technological Authority**. 

The visual direction follows a **Modern Corporate** aesthetic with **Glassmorphic** accents. It balances the "Deep Corporate Blue" of traditional legal and administrative services with the "Tech Blue" vibrancy of modern content operations. The UI evokes a sense of reliable precision through a highly structured layout, deliberate whitespace, and crisp interactive elements that respond with subtle depth.

Key visual principles:
- **Authority through Depth:** Use of tonal layering and soft shadows to organize complex data.
- **Efficiency through Clarity:** High-contrast inputs and a rigid typographic scale to minimize cognitive load during heavy operational tasks.
- **Modern Fluidity:** Subtle gradients and rounded geometry to soften the industrial nature of a management backend.

## Colors

This design system utilizes a hierarchical palette centered on **Deep Corporate Blue** for structural identity and **Tech Blue** for functional action.

- **Primary & Structural:** `#001529` is reserved for high-level navigation (sidebar) and branding. It should transition into a modern gradient (`#001529` to `#003a70`) specifically for authentication screens.
- **Action & Interactive:** `#409EFF` serves as the primary interaction color for buttons, active states, and focus indicators.
- **Surface Strategy:** The "App Area" uses a clean `#f2f3f5` light gray to reduce eye strain, while white (`#FFFFFF`) is used for cards and content containers to create clear elevation.
- **Platform Semantics:** Preserving existing mental models, specific semantic colors are mapped to social media platforms (Douyin-Red, Kuaishou-Green, etc.) to ensure rapid identification in dense tables.

## Typography

The typography system prioritizes technical legibility and structured hierarchy using **Hanken Grotesk** for its sharp, contemporary professional feel.

- **Headlines:** Use Bold and Semi-Bold weights to anchor page sections. For login and marketing-adjacent screens, `display-lg` uses expanded letter-spacing to evoke a "premium" feel.
- **Body Text:** Set at `14px` (body-md) as the default for density-heavy management tables.
- **Labels:** **Inter** is utilized for micro-copy and data labels due to its exceptional clarity at small scales (12px).
- **Scale:** On mobile devices, large display headers are scaled down significantly to maintain viewport efficiency.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed (with a collapse state for focus), while the main content area utilizes a fluid grid that optimizes for high-density data.

- **Grid System:** A 12-column system is used within the main content area.
- **Spacing Rhythm:** Based on an 8px base unit. 
- **Breakpoints:**
  - **Desktop (1200px+):** Full 200px sidebar, 32px page margins.
  - **Tablet (768px - 1199px):** Collapsed 64px sidebar, 24px page margins.
  - **Mobile (<767px):** Hidden sidebar (hamburger menu), 16px page margins, cards reflow to single-column stacks.
- **Component Spacing:** Use `stack-md` (16px) for standard vertical spacing between form elements and `gutter` (24px) for spacing between layout cards.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Tonal Layering** combined with **Ambient Shadows**.

- **Level 0 (Base):** The `#f2f3f5` background.
- **Level 1 (Content):** White (`#FFFFFF`) cards with a subtle 1px border (`rgba(0,0,0,0.05)`) and a very soft, diffused shadow: `0 4px 20px -2px rgba(0, 21, 41, 0.08)`.
- **Level 2 (Interactive/Floating):** Overlays, dropdowns, and modals use a more pronounced shadow and a backdrop blur (8px) to separate the element from the dense operational data beneath it.
- **Tonal Depth:** Sidebars use the darkest tone (`#001529`) to anchor the UI, creating a clear "Control vs. Content" distinction.

## Shapes

The design system employs a **Rounded** shape language to align with modern SaaS trends while maintaining professional restraint.

- **Standard Elements:** Buttons, input fields, and tags use `0.5rem` (8px) corner radii.
- **Containers:** Large content cards and modals use `rounded-lg` (16px) to create a softer, more approachable enclosure for complex data.
- **Icons:** Should follow a "Soft" style—rounded terminals and consistent 2px stroke weights.

## Components

### Buttons
- **Primary:** Solid `#409EFF` with white text. High-contrast, 0.5rem radius.
- **Secondary:** Outline variant with 1px Tech Blue border and transparent background.
- **Danger:** Reserved for destructive actions (e.g., "Delete Account"), using `#F56C6C`.

### Input Fields
- **State:** Standard state uses a light gray border; Focus state uses a 2px `#409EFF` border with a subtle outer glow.
- **Mobile High-Contrast:** Increase font size to 16px for inputs on mobile to prevent iOS zooming and ensure tap-target accessibility.

### Cards & Tables
- **Cards:** White background, 16px padding, subtle shadow.
- **Tables:** Zebra-striping is discouraged. Instead, use thin `1px` dividers in `#EBEEF5`. Header cells should have a slightly darker background (`#FAFAFA`).

### Chips & Tags
- **Platform Tags:** Use the named colors defined in the palette. Use "Light" variants (low opacity background with high opacity text) for secondary metadata and "Solid" variants for primary status.

### Publishing Tabs
- For the "Publishing Center," use a horizontal tab bar with a "Card-style" active state—the active tab should be white and visually merge with the content area below, while inactive tabs remain slightly grayed out.
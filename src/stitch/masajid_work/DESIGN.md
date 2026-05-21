---
name: Masajid Work
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e0'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2fa'
  surface-container: '#f2ecf4'
  surface-container-high: '#ece6ee'
  surface-container-highest: '#e6e0e9'
  on-surface: '#1d1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff7'
  outline: '#7a7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6750a4'
  primary: '#4f378a'
  on-primary: '#ffffff'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#cfbcff'
  secondary: '#63597c'
  on-secondary: '#ffffff'
  secondary-container: '#e1d4fd'
  on-secondary-container: '#645a7d'
  tertiary: '#765b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e0e9'
typography:
  display-lg:
    fontFamily: IBM Plex Sans
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-readable:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  arabic-body:
    fontFamily: Readex Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is anchored in the principles of **Amanah (Trust)** and **Khidmah (Service)**. It balances the technological requirements of a management platform with the spiritual and community-focused nature of a mosque. The visual language avoids the cold, clinical feel of corporate ERPs in favor of a "Community-Modernist" aesthetic—one that is clean and efficient but feels warm and inviting.

The style leverages generous whitespace and soft geometry to lower the cognitive load for administrators and donors. By prioritizing legibility and a calm color palette, the system fosters an environment of transparency and institutional reliability.

## Colors

The palette is rooted in a deep **Emerald Green**, symbolizing growth, life, and the traditional colors of Islamic architecture. This is used for primary actions, navigation headers, and key branding moments to establish immediate authority and trust.

**Warm Gold** and **Beige** are used sparingly as "illuminating" accents—mimicking the subtle metallic or stone details found in sacred spaces. Beige acts as a soft alternative to pure white for secondary containers, reducing eye strain. The background remains a crisp, very light gray to maintain a modern, "breathable" feel.

## Typography

The system utilizes **IBM Plex Sans** for its structured yet humanistic qualities. Its technical precision ensures the platform feels professional, while its open apertures keep it friendly. For the Arabic script, **Readex Pro** is selected for its modern geometric clarity, which perfectly aligns with the Latin character weights.

Typography is scaled intentionally large to ensure accessibility for mosque elders and community members. Body text is set at a comfortable 18px base to prioritize readability over information density.

## Layout & Spacing

This design system employs a **Fixed-Fluid Hybrid Grid**. On desktop, content is housed within a centered 12-column container to prevent line lengths from becoming unreadable on ultra-wide monitors. On tablet and mobile, the layout transitions to a fluid model with generous side margins (24px).

A "Soft-Grid" approach is used for vertical rhythm, relying on multiples of 8px. To avoid a cluttered "dashboard" feel, sections are separated by significant vertical padding (xl), giving each data point room to breathe and emphasizing transparency.

## Elevation & Depth

Depth is communicated through **Ambient Shadows** and **Tonal Layering** rather than harsh borders. Surfaces use a very subtle blur with a hint of the primary green in the shadow color to maintain harmony.

- **Level 0 (Background):** #f9fafb.
- **Level 1 (Cards/Content):** Pure white with a 10% opacity Emerald shadow, used for main content areas.
- **Level 2 (Modals/Popovers):** Deeper shadow to indicate temporary interaction.

Navigation is kept "flat" against the background or slightly recessed using a subtle inner shadow to signify its foundational role.

## Shapes

The shape language is defined by **Soft Geometricism**. Rounded corners are applied consistently at 12px for larger containers (cards, modals) and 8px for interactive elements (buttons, inputs). This specific radius avoids the "playfulness" of ultra-rounded pill shapes while steering clear of the "aggressive" nature of sharp corners.

This middle ground reflects a platform that is modern and approachable yet serious about the management of community funds.

## Components

### Buttons
Primary buttons use the Emerald Green background with white text. Hover states shift toward a slightly deeper shade. Secondary buttons utilize the Gold accent as a text color or a very thin 1px border.

### Cards
Cards are the primary vessel for information. They must never feel "boxed in." Use `card-radius` and a subtle shadow. Headers within cards should use the `headline-md` type scale to clearly delineate sections.

### Inputs
Text fields use a light gray border that thickens and turns Emerald Green on focus. Labels always sit above the field in `label-sm` for maximum clarity.

### Chips & Badges
Used for status (e.g., "Verified," "Pending"). These should use very desaturated versions of the status color (e.g., a very pale green background with dark green text) to maintain the non-commercial mood.

### Progress Bars
Specifically for donation goals, these should use a dual-tone Emerald and Beige. The "glow" of the gold can be used for "Goal Reached" states to provide a sense of communal achievement.

### Icons
Line icons (weight: medium) are preferred. They should be clear and literal. Avoid overly abstract iconography to ensure the interface remains intuitive for all age groups.
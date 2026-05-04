---
design_tokens:
  colors:
    brand:
      orange: "#F58220"
      dark_blue: "#223445"
      accent_blue: "#3E5266"
      white: "#FFFFFF"
    background:
      light: "#F0F2F5"
      dark: "#1A2633"
    glass:
      bg_light: "rgba(255, 255, 255, 0.9)"
      bg_dark: "rgba(34, 52, 69, 0.8)"
      border_light: "rgba(245, 130, 32, 0.2)"
      border_dark: "rgba(245, 130, 32, 0.3)"
  gradients:
    primary: "linear-gradient(135deg, #223445 0%, #3E5266 100%)"
  typography:
    fonts:
      primary: "'Segoe UI', 'Outfit', Tahoma, Geneva, Verdana, sans-serif"
    sizes:
      h2: "2rem"
      body: "1.1rem"
      small: "0.95rem"
      tiny: "0.75rem"
    weights:
      normal: 400
      semibold: 600
      bold: 700
      extrabold: 800
  radii:
    pill: "30px"
    large: "20px"
    medium: "18px"
    small: "12px"
    tiny: "8px"
  shadows:
    card: "0 12px 40px rgba(34, 52, 69, 0.15)"
    hover_orange: "0 4px 12px rgba(245, 130, 32, 0.3)"
    hover_dark: "0 8px 20px rgba(34, 52, 69, 0.2)"
  motion:
    durations:
      fast: "0.2s"
      normal: "0.3s"
    easings:
      fade_in: "ease-out"
---

# Alight Helpdesk Glass Redesign

## Visual Identity & Intent

The Alight Helpdesk embraces a **"Glass-Corporate"** aesthetic that balances professional, enterprise-grade reliability with modern, high-fidelity design trends. The visual language is defined by depth, transparency, and a vibrant yet constrained color palette.

### Core Philosophy
- **Professional Transparency:** The use of glassmorphism (translucent backgrounds with background blur) signifies clarity and openness, reducing the cognitive load of a traditional dense helpdesk interface. It feels light and welcoming.
- **Brand Authority:** The dark blue gradient (`linear-gradient(135deg, #223445 0%, #3E5266 100%)`) anchors the design with a sense of security and corporate strength, while the energetic brand orange (`#F58220`) acts as a highly visible, engaging call-to-action color.
- **Soft Geometry:** Extensive use of generous border radii (20px for main cards, 30px for interactive elements like buttons and inputs) removes harsh edges, creating an approachable and human-centric experience.

### Interaction & Motion
Interactions should feel responsive, smooth, and tactile:
- Elements like buttons and suggestion cards scale up or translate slightly on hover (`transform: translateY(-2px)` or `translateX(5px)`), giving users immediate feedback.
- Hover states are accentuated by dynamic drop shadows (often tinted with the brand orange or dark blue) rather than just flat color changes, maintaining the spatial depth of the interface.
- Entrance animations, such as the `fadeIn` for chat bubbles, should slide up slightly while fading in (`transform: translateY(10px)` to `0`), making the UI feel alive and conversational.

### Theming
The design system inherently supports both Light and Dark modes:
- **Light Mode:** Relies on a soft off-white background (`#F0F2F5`) with bright, highly translucent glass panels (`rgba(255, 255, 255, 0.9)`).
- **Dark Mode:** Transitions to a deep navy background (`#1A2633`) with darkened glass panels (`rgba(34, 52, 69, 0.8)`) and subtly thicker, more opaque orange glass borders to maintain contrast and legibility in low-light environments.

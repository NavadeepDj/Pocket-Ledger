/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#19332F',
    tint: '#F06F58',

    // Core surfaces
    background: '#F7F4EC',
    foreground: '#19332F',

    // Cards / elevated surfaces
    card: '#FFFDF8',
    cardForeground: '#19332F',

    // Primary action color (buttons, links, active states)
    primary: '#F06F58',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E6F1EA',
    secondaryForeground: '#19332F',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EEEAE1',
    mutedForeground: '#77827D',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#E6F1EA',
    accentForeground: '#19332F',

    // Destructive actions (delete, error states)
    destructive: '#D6524A',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DDD9D0',
    input: '#D7D2C8',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;

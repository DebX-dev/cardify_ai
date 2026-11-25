/**
 * Design token reference for Cardify AI (used alongside Tailwind CSS v4 @theme in src/styles.css).
 */
export const cardifyDesignTokens = {
  fonts: {
    display: ['Fraunces', 'Georgia', 'serif'],
    sans: ['Inter', 'system-ui', 'sans-serif'],
  },
  colors: {
    brandFrom: '#6366f1',
    brandVia: '#8b5cf6',
    brandTo: '#d946ef',
  },
} as const;
export default cardifyDesignTokens;

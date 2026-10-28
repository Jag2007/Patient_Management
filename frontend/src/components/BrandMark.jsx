// App logo (a cross in a rounded square), used in the sidebar and on the login page.
import { colors } from '../theme';

export default function BrandMark({ size = 40, light = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 3.5,
        background: light ? 'rgba(255,255,255,0.14)' : colors.accent,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#fff" />
      </svg>
    </div>
  );
}

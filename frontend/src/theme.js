// App colours and Ant Design theme: a calm "clinical pine and ivory" palette for a hospital staff portal.
// Every page gets these through ConfigProvider in main.jsx, so colours are defined in one place.
export const colors = {
  primary: '#1F5E4F',
  primaryDark: '#14352D',
  primarySoft: '#E7F0EB',
  accent: '#C0704A',
  text: '#1C2B27',
  textSecondary: '#4C5B56',
  textMuted: '#7C8A85',
  background: '#F6F4EE',
  surface: '#FFFFFF',
  border: '#E3DFD5',
  info: '#3C6E91',
  success: '#2E8B57',
  warning: '#C98A1E',
  error: '#B5473A',
  ai: '#6B5B95',
};

export const theme = {
  token: {
    colorPrimary: colors.primary,
    colorInfo: colors.info,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textMuted,
    colorBgLayout: colors.background,
    colorBorder: colors.border,
    colorBorderSecondary: '#EDEAE2',
    borderRadius: 10,
    fontFamily: "Manrope, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: { siderBg: colors.primaryDark, headerBg: colors.surface },
    Menu: {
      darkItemBg: colors.primaryDark,
      darkItemColor: 'rgba(255,255,255,0.72)',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemSelectedBg: 'rgba(255,255,255,0.12)',
      darkItemSelectedColor: '#FFFFFF',
      itemBorderRadius: 10,
      itemHeight: 44,
    },
    Table: { headerBg: '#F1EFE8', headerColor: colors.textSecondary, rowHoverBg: '#F7FAF8' },
    Card: { borderRadiusLG: 16 },
    Button: { primaryShadow: '0 4px 12px rgba(31,94,79,0.18)' },
  },
};

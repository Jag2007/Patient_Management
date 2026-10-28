// App colours and Ant Design theme, based on the Prodoc AI website palette.
// Every page gets these through ConfigProvider in main.jsx, so colours are defined in one place.
export const colors = {
  primary: '#2463E8',
  primaryDeep: '#0B2F78',
  primaryTint: '#F0F6FF',
  text: '#14213D',
  textSecondary: '#43526A',
  textMuted: '#6F7D91',
  background: '#F5F8FC',
  border: '#E1E8F0',
  success: '#22B573',
  warning: '#E9A23B',
  error: '#D9535B',
  teal: '#18B7B0',
  purple: '#7457E8',
};

export const theme = {
  token: {
    colorPrimary: colors.primary,
    colorInfo: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textMuted,
    colorBgLayout: colors.background,
    colorBorder: colors.border,
    colorBorderSecondary: colors.border,
    borderRadius: 10,
    fontFamily: "Switzer, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: { headerBg: '#FFFFFF', headerPadding: '0 24px' },
    Menu: { itemBg: 'transparent', horizontalItemSelectedColor: colors.primary },
    Table: { headerBg: colors.primaryTint, headerColor: colors.textSecondary, rowHoverBg: '#F7FAFF' },
    Card: { borderRadiusLG: 14 },
  },
};

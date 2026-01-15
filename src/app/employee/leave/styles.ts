// Leave Module Styles
export const leaveStyles = {
  // Container Styles
  container: {
    base: "w-full space-y-6 lg:space-y-8",
    header: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8",
    title: "text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent",
    subtitle: "mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 font-medium",
  },

  // Card Styles (Glass Effect)
  card: {
    base: "bg-white/50 backdrop-blur-md rounded-xl sm:rounded-2xl border border-orange-100/40 shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 lg:p-6",
    compact: "bg-white/50 backdrop-blur-md rounded-xl border border-orange-100/40 shadow-md p-3 sm:p-4",
    hover: "hover:bg-white/60 hover:border-orange-200/60 transition-all duration-300",
  },

  // Grid Layouts
  grid: {
    stats: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5",
    main: "grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6",
    balance: "grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6",
  },

  // Stat Card Styles - Enhanced
  statCard: {
    base: "bg-gradient-to-br from-white/70 via-white/50 to-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-orange-100/60 shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 lg:p-6 transform hover:-translate-y-1",
    iconContainer: "flex items-center justify-center w-12 sm:w-14 h-12 sm:h-14 rounded-xl shadow-md",
    value: "text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent mt-3",
    label: "text-sm sm:text-base text-gray-700 font-semibold mt-2",
  },

  // Badge Styles
  badge: {
    base: "inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold",
    approved: "bg-green-100/80 text-green-700 border border-green-300/50 shadow-sm",
    pending: "bg-yellow-100/80 text-yellow-700 border border-yellow-300/50 shadow-sm",
    rejected: "bg-red-100/80 text-red-700 border border-red-300/50 shadow-sm",
    active: "bg-orange-100/80 text-orange-700 border border-orange-300/50 shadow-sm",
  },

  // Button Styles - Enhanced
  button: {
    primary: "flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 text-sm sm:text-base",
    secondary: "flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/60 border border-orange-200/50 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-white/80 hover:border-orange-300/60 transition-all duration-300 text-xs sm:text-sm shadow-md",
    tertiary: "flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50/50 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300",
  },

  // Filter Button Styles - Enhanced
  filterButton: {
    base: "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 shadow-sm",
    active: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md hover:shadow-lg",
    inactive: "bg-white/60 text-gray-700 border border-orange-100/50 hover:bg-white/80 hover:border-orange-200/60",
  },

  // Progress Bar Styles - Enhanced
  progressBar: {
    container: "w-full bg-gray-200/60 rounded-full h-2.5 sm:h-3 overflow-hidden shadow-inner",
    fill: "h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-full transition-all duration-500 shadow-lg",
  },

  // Form Styles - Enhanced
  form: {
    group: "space-y-2.5",
    label: "text-sm sm:text-base font-bold text-gray-800",
    input: "w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-200/50 rounded-lg bg-white/70 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm",
    select: "w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-200/50 rounded-lg bg-white/70 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm",
    textarea: "w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-200/50 rounded-lg bg-white/70 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm resize-none shadow-sm",
  },

  // List Item Styles - Enhanced
  listItem: {
    base: "bg-white/60 backdrop-blur-md border border-orange-100/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 hover:bg-white/70 hover:border-orange-200/70 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
    header: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4",
    title: "text-base sm:text-lg font-bold text-gray-900",
    subtitle: "text-xs sm:text-sm text-gray-600 font-medium mt-1",
    details: "grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm mb-4",
    detailItem: "flex flex-col",
    detailLabel: "text-gray-600 font-bold text-xs",
    detailValue: "text-gray-900 font-bold mt-1 text-sm",
  },

  // Section Styles - Enhanced
  section: {
    title: "text-lg sm:text-xl font-bold text-gray-900 mb-2",
    subtitle: "text-xs sm:text-sm text-gray-600 font-medium mb-4 sm:mb-5",
  },

  // Responsive Utilities
  responsive: {
    spacing: "p-4 sm:p-5 lg:p-6 gap-4 sm:gap-5 lg:gap-6",
    textSize: "text-sm sm:text-base lg:text-lg",
    flex: "flex flex-col sm:flex-row",
  },

  // Icon Colors - Enhanced
  iconColor: {
    approved: "text-green-500",
    pending: "text-yellow-500",
    rejected: "text-red-500",
    active: "text-orange-500",
    calendar: "text-orange-500",
    document: "text-purple-500",
    alert: "text-orange-600",
  },
};

const config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      textColor: {
        'text-purple': 'var(--text-purple)',
        'text-blue': 'var(--text-blue)',
        'text-green': 'var(--text-green)',
        'text-yellow': 'var(--text-yellow)',
        'text-red': 'var(--text-red)',
        'text-muted': 'var(--text-muted)',
      },
      backgroundColor: {
        'bg-input': 'var(--bg-input)',
        'bg-toolbar': 'var(--bg-toolbar)',
        'bg-red': 'var(--bg-red)',
      },
      borderColor: {
        'border': 'var(--border)',
      },
    },
  },
  plugins: [],
};
export default config;

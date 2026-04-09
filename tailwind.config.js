/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0B87ED',
        secondary: '#00E0FF',
        accent: '#E4027F',
        surface: '#F4F8FC',
        ink: '#10243E'
      },
      boxShadow: {
        soft: '0 20px 40px -28px rgba(11, 135, 237, 0.4)'
      },
      borderRadius: {
        '2xl': '1.5rem'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'dashboard-glow':
          'radial-gradient(circle at top left, rgba(0, 224, 255, 0.18), transparent 40%), radial-gradient(circle at top right, rgba(228, 2, 127, 0.12), transparent 35%)'
      }
    }
  },
  plugins: []
};

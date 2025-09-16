/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'josefin': ['Josefin Sans', 'Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        'black': '#000000',
        'white': '#FFFFFF',
        'white-dim': 'rgba(255, 255, 255, 0.84)',
        'gray-70': 'rgba(255, 255, 255, 0.70)',
        'gray-50': 'rgba(255, 255, 255, 0.50)',
        'gray-35': 'rgba(255, 255, 255, 0.35)',
        'control-border': 'rgba(255, 255, 255, 0.26)',
        'fill': 'rgba(255, 255, 255, 0.06)',
        'fill-hover': 'rgba(255, 255, 255, 0.10)',
        'glow-blue-1': '#9CC7FF',
        'glow-blue-2': '#5BA3FF',
        'glow-blue-3': '#CFE3FF',
        'blue-2': '#5BA3FF',
      },
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '6.5': '26px',
        '7': '28px',
        '16': '64px',
        '18': '72px',
        '28': '112px',
        '30': '120px',
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '26px'],
        'lg': ['18px', '28px'],
        'xl': ['22px', '32px'],
      },
      letterSpacing: {
        'wider': '0.08em',
        'widest': '0.12em',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'bounce-gentle': 'bounce-gentle 1.8s ease-in-out infinite',
        'smoke-drift': 'smoke-drift 6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
        'smoke-swirl': 'smoke-swirl 8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
        'smoke-float': 'smoke-float 5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
        'smoke-particles': 'smoke-particles 4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
        'smoke-trail': 'smoke-trail 10s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
      },
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': {
            transform: 'translateY(0px)',
            opacity: '0.8',
          },
          '50%': {
            transform: 'translateY(10px)',
            opacity: '1',
          },
        },
        'smoke-drift': {
          '0%, 100%': {
            transform: 'translate(50%, -50%) rotate(0deg) scale(1)',
            opacity: '0.9',
          },
          '50%': {
            transform: 'translate(50%, -50%) rotate(90deg) scale(1.15)',
            opacity: '0.6',
          },
        },
        'smoke-swirl': {
          '0%, 100%': {
            transform: 'translate(50%, -50%) rotate(0deg) scale(0.95)',
            opacity: '0.4',
          },
          '33%': {
            transform: 'translate(50%, -50%) rotate(120deg) scale(1.1)',
            opacity: '0.6',
          },
          '66%': {
            transform: 'translate(50%, -50%) rotate(240deg) scale(0.9)',
            opacity: '0.5',
          },
        },
        'smoke-float': {
          '0%, 100%': {
            transform: 'translate(50%, -50%) translateY(0px) translateX(0px) rotate(0deg)',
            opacity: '0.3',
          },
          '25%': {
            transform: 'translate(50%, -50%) translateY(-15px) translateX(10px) rotate(45deg)',
            opacity: '0.4',
          },
          '50%': {
            transform: 'translate(50%, -50%) translateY(-5px) translateX(-5px) rotate(90deg)',
            opacity: '0.2',
          },
          '75%': {
            transform: 'translate(50%, -50%) translateY(10px) translateX(-15px) rotate(135deg)',
            opacity: '0.35',
          },
        },
        'smoke-particles': {
          '0%, 100%': {
            transform: 'translate(50%, -50%) scale(1) rotate(0deg)',
            opacity: '0.25',
          },
          '50%': {
            transform: 'translate(50%, -50%) scale(1.3) rotate(180deg)',
            opacity: '0.4',
          },
        },
        'smoke-trail': {
          '0%, 100%': {
            transform: 'translate(50%, -50%) scaleX(1) scaleY(1) rotate(0deg)',
            opacity: '0.15',
          },
          '50%': {
            transform: 'translate(50%, -50%) scaleX(1.2) scaleY(0.8) rotate(5deg)',
            opacity: '0.25',
          },
        },
      },
      backdropBlur: {
        'sm': '4px',
        'md': '6px',
      },
      opacity: {
        '3': '0.03',
        '22': '0.22',
      },
    },
  },
  plugins: [],
};
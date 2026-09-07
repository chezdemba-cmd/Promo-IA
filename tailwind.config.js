/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Vert WhatsApp pour l'identité produit
        brand: { DEFAULT: '#128C7E', dark: '#075E54', light: '#25D366' },
      },
    },
  },
  plugins: [],
};

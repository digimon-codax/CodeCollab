/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3B82F6',
                    dark: '#2563EB',
                },
                dark: {
                    bg: '#0A0A0A',
                    surface: '#1E1E1E',
                    elevated: '#252526',
                    border: '#3E3E42',
                },
            },
            fontFamily: {
                mono: ['Fira Code', 'Monaco', 'Courier New', 'monospace'],
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}

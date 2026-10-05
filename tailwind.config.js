/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './public/**/*.html',
        './public/js/**/*.js'
    ],
    theme: {
        extend: {
            /* ----------------------------------------------------------------
               KCNP Agro palette.

               Every value below was picked against the page background
               (#F8FAF5) so the text that uses it clears WCAG AA (4.5:1):

                 #2E7D32 on #F8FAF5  -> 4.88:1   titles, buttons
                 #1B2A1B on #F8FAF5  -> 14.2:1   body copy
                 #795548 on #F8FAF5  -> 6.35:1   soil-brown details
                 #966300 on #F8FAF5  -> 4.90:1   accent text

               NOTE on the accent: #FFB300 is the brand harvest amber and is
               used for FILLS (icon chips, progress bars, borders, dots).
               As body text it is only 1.67:1 on the page background, so the
               300/400 steps of the ramp are deliberately darker siblings of
               the same hue and every `text-accent-*` rule uses those instead.
               ---------------------------------------------------------------- */
            colors: {
                /* Page / section surfaces */
                canvas: '#F8FAF5',
                surface: '#FFFFFF',
                'surface-tint': '#E8F5E9',
                ink: '#1B2A1B',

                /* Primary green -- #2E7D32 */
                primary: {
                    50:  '#F1F8F2',
                    100: '#E8F5E9',
                    200: '#C8E6C9',
                    300: '#4C8C50',
                    400: '#2E7D32',
                    500: '#2E7D32',
                    600: '#276729',
                    700: '#1F5121',
                    800: '#183D19',
                    900: '#122E13'
                },

                /* Harvest amber -- #FFB300 (fills) with readable text steps */
                accent: {
                    50:  '#FFF8E1',
                    100: '#FFEDBF',
                    200: '#FFE08A',
                    300: '#8A5A00',
                    400: '#966300',
                    500: '#FFB300',
                    600: '#8A5A00',
                    700: '#6B4700',
                    800: '#4E3400',
                    900: '#332300'
                },

                /* Soil brown -- #795548, for small details */
                soil: {
                    50:  '#EFEBE9',
                    100: '#DED4D0',
                    200: '#C3ADA4',
                    300: '#A5857A',
                    400: '#795548',
                    500: '#795548',
                    600: '#63423A',
                    700: '#4E332D',
                    800: '#3A2521',
                    900: '#261815'
                },

                /* Hero photo scrim: dark enough for white type over imagery */
                'hero-scrim': '#0E3B21',

                /* Kept so existing neutral chips (e.g. star ratings) stay legible */
                dark: {
                    900: '#0c1222',
                    800: '#111827',
                    700: '#1e293b',
                    600: '#334155'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Poppins', 'sans-serif']
            }
        }
    },
    plugins: []
};
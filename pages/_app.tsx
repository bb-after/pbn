import type { AppProps } from 'next/app';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CustomThemeProvider>
      <Component {...pageProps} />
    </CustomThemeProvider>
  );
}

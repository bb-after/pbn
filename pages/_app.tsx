import type { AppProps } from 'next/app';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ui/IntercomToast';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CustomThemeProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </CustomThemeProvider>
  );
}

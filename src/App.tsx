import Dashboard from './components/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Dashboard />
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

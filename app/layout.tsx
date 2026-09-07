import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import { SpeedInsights } from '@vercel/speed-insights/next';
config.autoAddCss = false;
export const metadata: Metadata = { title: { default: 'Certamen · Let the games begin', template: '%s · Certamen' }, description: 'Train your classics knowledge. Rally your rivals. Race to the buzzer.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body><Providers>{children}</Providers><SpeedInsights /></body></html>;
}
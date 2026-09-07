import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Sign in' };
export default function SigninLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Zap, Settings, ArrowUpRight } from 'lucide-react';
export default function TopNavbar({ publicNav = false }: { publicNav?: boolean }) {
 const pathname = usePathname();
 return <header className="site-header"><Link className="brand" href="/" aria-label="Certamen home"><span className="brand-mark"><Zap size={22} fill="currentColor" /></span>certamen<span className="brand-dot">.</span></Link><nav aria-label="Main navigation" className="main-nav">{[{ href: '/study', label: 'Train', Icon: BookOpen }, { href: '/play', label: 'Compete', Icon: Zap }].map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={pathname?.startsWith(href) ? 'page' : undefined}><Icon size={17} />{label}</Link>)}</nav>{publicNav ? <Link className="btn btn-small" href="/auth/signin">Sign in <ArrowUpRight size={16} /></Link> : <Link className="nav-settings" href="/settings" aria-label="Your profile and settings"><Settings size={20} /></Link>}</header>;
}
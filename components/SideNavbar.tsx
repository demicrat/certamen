'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ArrowLeft, UserRound, Settings, LogOut } from 'lucide-react';
export default function SideNavbar({ selectedTab, setSelectedTab }: { selectedTab: string; setSelectedTab: (tab: string) => void }) {
 return <aside className="settings-sidebar"><span className="eyebrow">YOUR PLAYER CARD</span><nav aria-label="Profile navigation"><Link href="/study"><ArrowLeft size={16} /> Back to training</Link><button aria-current={selectedTab === 'profile' ? 'page' : undefined} onClick={() => setSelectedTab('profile')}><UserRound size={17} /> Profile</button><button aria-current={selectedTab === 'account-info' ? 'page' : undefined} onClick={() => setSelectedTab('account-info')}><Settings size={17} /> Account settings</button><button onClick={() => signOut({ callbackUrl: '/' })}><LogOut size={17} /> Sign out</button></nav></aside>;
}
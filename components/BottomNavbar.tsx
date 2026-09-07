import { Sparkles, Coins } from 'lucide-react';
export default function BottomNavbar({ user }: { user: { xp: number; level: number; coins: number; profilePic: string } }) {
 return <footer className="player-bar"><span><Sparkles size={16} /> Level {user.level || 1}</span><div className="xp-track" aria-label={`${user.xp || 0} experience points`}><i style={{ width: `${Math.min(100, Math.max(0, user.xp || 0))}%` }} /></div><span>{user.xp || 0} / 100 XP</span><span className="ml-auto"><Coins size={16} /> {user.coins || 0}</span></footer>;
}
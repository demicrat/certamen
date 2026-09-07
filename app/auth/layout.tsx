import TopNavbar from '@/components/TopNavbar';
import { Trophy } from 'lucide-react';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
 return <><TopNavbar publicNav /><main className="auth-page"><section className="auth-story"><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h1>Big ideas.<br />Quick reflexes.<br /><em>Your kind of game.</em></h1><p>A place for curious minds and friendly rivals.<br />Build your knowledge. Find your competition.</p><Trophy size={74} strokeWidth={1.3} /><p className="auth-motto">DISCITE LUDENDO — LEARN BY PLAYING.</p></section><section className="auth-form-area">{children}</section></main></>;
}
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import TopNavbar from "@/components/TopNavbar";
import BottomNavbar from "@/components/BottomNavbar";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    // If no session, redirect to sign-in page
    redirect("/auth/signin");
  }
 
  const user = {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    bio: session.user.bio,
    profile: session.user.profile,
    division: session.user.division,
    specialties: session.user.specialties,
    skill: session.user.skill,
    coins: session.user.coins,
    level: session.user.level,
    xp: session.user.xp,
    lessons: session.user.lessons,
    characters: session.user.characters,
    team: session.user.team,
    profilePic: session.user.profile ? `/${session.user.profile}.jpg` : "/default.jpg",
  };

  /*const user = {
    level: session.user.level !== undefined ? session.user.level : 1,
    xp: session.user.xp !== undefined ? session.user.xp : 0,
    coins: session.user.coins !== undefined ? session.user.coins : 0,
    profilePic: session.user.profile
      ? `/${session.user.profile}.jpg`
      : "/default.jpg",
  };*/

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      <main className="dashboard-main">{children}</main>
      <BottomNavbar user={user} />
    </div>
  );
};

export default DashboardLayout;

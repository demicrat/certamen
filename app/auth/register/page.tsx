"use client";
import Link from "next/link";
import { useState } from "react";
import { auth } from '@/lib/firebaseClient';
import Input from '@/components/FormTextInput';
import firebase from 'firebase/compat/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { browserPopupRedirectResolver } from "firebase/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Register() {
  const router = useRouter();
  const { data: session } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState("default");
  const [division, setDivision] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [skill, setSkill] = useState<number[]>([0, 0, 0, 0, 0]);
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [lessons, setLessons] = useState<string[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [bio, setBio] = useState("none yet!");
  const [error, setError] = useState("");
  const [idToken, setIdToken] = useState("");
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false); // Add this state

  /*useEffect(() => {
    if (session) {
      router.push('/auth/signin');
    }
  }, [session, router]);*/

 const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateUsername = (username: string) => {
    const re = /^[a-zA-Z0-9.\-_!?]+$/;
    return re.test(username) && username.length >= 3;
  };

  const addSpecialty = (specialty: string) => {
    setSpecialties((prevSpecialties) => {
      if (prevSpecialties.includes(specialty)) {
        return prevSpecialties.filter((item) => item !== specialty);
      } else {
        return [...prevSpecialties, specialty];
      }
    });
  };

  const registerUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateEmail(email)) {
      setError("Invalid email address");
      return;
    }
    if (!validateUsername(username)) {
      setError("Username can only contain letters, numbers, and the characters '.', '-', '_', '!', and '?' and must be at least 3 characters long");
      return;
    }
    if (password.length < 6 && !googleSignedIn) {
      setError("Password must be at least 6 characters long");
      return;
    }
    setError(""); // Clear any previous errors

    const userData: { [key: string]: any } = {
      email,
      //password: googleSignedIn ? undefined : password,
      username,
      profile,
      division,
      specialties,
      skill,
      coins,
      level,
      xp,
      lessons,
      characters,
      team,
      bio,
      //idToken: googleSignedIn ? idToken : undefined,
    };

    if (!googleSignedIn) {
      console.log("good morning USA");
      userData.password = password;
    } else {
      console.log("why isnt' it working");
      userData.idToken = idToken;
    }

    // Remove undefined fields
    Object.keys(userData).forEach(key => {
      if (userData[key] === undefined) {
        delete userData[key];
      }
    });

    console.log("goo");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("bah");
    let data;
    try {
      data = await response.json();
    } catch (error) {
      setError("Failed to parse server response. Please try again.");
      return;
    }

    if (!response.ok) {
      setError(data.message || "Failed to register");
      return;
    }

    try {
      if (data.message === "Email already in use") {
        setError(data.message); // Display server-side error
      } else {
        console.log(data);
        router.push('/auth/signin');
      }
    } catch (error) {
      setError("Failed to parse response");
      console.error("Failed to parse JSON response", error);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || isSigningIn) return;
    setIsSigningIn(true); // Disable the button
    
    const provider = new GoogleAuthProvider();
    console.log("1");
    try {
      console.log("2");
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      console.log("3");
      const idToken = await result.user.getIdToken();
      console.log("4");
      const email = result.user.email || "";
     
      console.log("5");
      // Check if the email is already in use
      const response = await fetch("../../api/auth/checkEmail", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("6");

      const data = await response.json();

      if (data.exists) {
        setIsSigningIn(false);
        setError("Email already in use");
        return;
      }

      setIdToken(idToken);
      setEmail(email);
      //setName(result.user.displayName || "");
      setIsSigningIn(false);
      setGoogleSignedIn(true);
    } catch (error) {
      setIsSigningIn(false);
      console.error("Google sign-in error:", error);
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-500">
      <div className="bg-beige-300 p-8 rounded-lg shadow-lg max-w-lg w-full"> {/* max-w-lg to make it wider */}
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">
          {googleSignedIn ? 'Finish Account Creation' : 'Sign Up'}
        </h2>
        {error && <div className="mb-4 text-red-500">{error}</div>}
        <form onSubmit={registerUser}>
          {!googleSignedIn && (
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 text-xs font-bold mb-2 uppercase">
                Email <span className="text-red-500">*</span>
              </label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} id="email" required />
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 text-xs font-bold mb-2 uppercase">
              Username <span className="text-red-500">*</span>
            </label>
            <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} id="username" required />
          </div>
          {!googleSignedIn && (
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 text-xs font-bold mb-2 uppercase">
                Password <span className="text-red-500">*</span>
              </label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} id="password" required />
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="division" className="block text-gray-700 text-xs font-bold mb-2 uppercase">Certamen Division</label> {/* Smaller and capitalized */}
            <select
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="" disabled>Select your division</option>
              <option value="MS1">MS1</option>
              <option value="MS2">MS2</option>
              <option value="MS3">MS3</option>
              <option value="HS1">HS1</option>
              <option value="HS2">HS2</option>
              <option value="HS3">HS3</option>
              <option value="Advanced">Advanced (HS4+)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-xs font-bold mb-2 uppercase">Specialty</label> {/* Smaller and capitalized */}
            <div className="flex flex-wrap">
              {["myth", "history", "literature", "pmaq", "vocab", "grammar", "culture"].map((specialty) => (
                <div key={specialty} className="flex items-center mr-4">
                  <input
                    type="checkbox"
                    id={`specialty-${specialty}`}
                    onChange={() => addSpecialty(specialty)}
                    className="mr-1 leading-tight"
                  />
                  <label htmlFor={`specialty-${specialty}`} className="text-gray-700 text-sm">{specialty.charAt(0).toUpperCase() + specialty.slice(1)}</label>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-700 focus:outline-none focus:shadow-outline">
            Register
          </button>
        </form>
        {!googleSignedIn && (<div className="mt-4">
          <button onClick={signInWithGoogle} className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-400 focus:outline-none focus:shadow-outline">
            Sign Up with Google
          </button>
        </div>)}
        <p className="small-note text-center">Already in the game? <Link href="/auth/signin" className="text-indigo-600">Sign in</Link></p>
      </div>
    </div>
  );
}

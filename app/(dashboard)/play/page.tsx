'use client';

import { useState, useRef, useEffect } from 'react';
import { checkRoomExists } from '@/lib/checkRoomExists';
import axios from 'axios';

export default function PlayPage() {
  const [mode, setMode] = useState('FFA');
  const [code, setCode] = useState(['', '', '', '']);
  const [user, setUser] = useState<any>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const session = await axios.get('/api/auth/session');
        if (session && session.data.user) {
          const res = await axios.get(`/api/user/${session.data.user.id}`);
          setUser(res.data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^[A-Za-z0-9]$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    if (index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newCode = [...code];

      if (newCode[index]) {
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = '';
        setCode(newCode);
        inputsRef.current[index - 1]?.focus();
      }

      e.preventDefault();
    }
  };

  const redirectWithSessionInfo = (roomCode: string, isOwner: boolean) => {
    if (!user) return;

    const userData = {
      username: user.username,
      division: user.division,
      specialties: user.specialties,
      pfp: '🧠', // change to actual pfp later if you want
    };

    sessionStorage.setItem('certamen-user', JSON.stringify(userData));
    sessionStorage.setItem('certamen-is-owner', isOwner ? 'true' : 'false');

    console.log(`[redirecting to /play/${roomCode}]`, {
      userData,
      isOwner,
    });

    window.location.href = `/play/${roomCode}`;
  };

  const createGame = () => {
    const generatedCode = [...Array(4)].map(() =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    redirectWithSessionInfo(generatedCode, true);
  };

  const joinGame = async () => {
    const joinedCode = code.join('');
    if (joinedCode.length === 4) {
      const exists = await checkRoomExists(joinedCode);
      if (!exists) {
        alert('That game room does not exist.');
        return;
      }

      redirectWithSessionInfo(joinedCode, false);
    }
  };
  /*const joinGame = () => {
    const joinedCode = code.join('');
    if (joinedCode.length === 4) {
      redirectWithSessionInfo(joinedCode, false);
    }
  };*/

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-4xl mt-20 font-semibold mb-6 text-center">PLAY CERTAMEN</h1>

      <div className="mb-6">
        <select
          className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="FFA">Free-for-All</option>
          <option value="TEAMS" disabled>Teams (coming soon)</option>
        </select>
      </div>

      <div className="flex justify-between gap-2 mb-6">
        {code.map((char, index) => (
          <input
            key={index}
            ref={(el) => {inputsRef.current[index] = el}}
            maxLength={1}
            value={char}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-14 h-14 text-center text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-300"
          />
        ))}
      </div>

      <button
        onClick={joinGame}
        className="w-full bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600 transition duration-300"
      >
        Join Game
      </button>

      <p className="text-center text-sm mt-4 text-gray-500">or</p>

      <button
        onClick={createGame}
        className="w-full bg-zinc-200 text-black py-2 mt-2 rounded-md hover:bg-zinc-300 transition duration-300"
      >
        Create Game
      </button>
    </div>
  );
}

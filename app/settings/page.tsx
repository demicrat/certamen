'use client';
import React, { useState, useEffect } from 'react';
import { useSession, getSession, signIn } from 'next-auth/react';
import TopNavbar from '@/components/TopNavbar';
import SideNavbar from '@/components/SideNavbar';
import Input from '@/components/FormTextInput';
import Textarea from '@/components/Textarea';
import axios from 'axios';
import FormButton from '@/components/FormButton';
import Image from 'next/image';
import ConfirmationPopup from '@/components/ConfirmationPopup';

const ProfilePage: React.FC = () => {
  const { data: session } = useSession();
  const [selectedTab, setSelectedTab] = useState('profile');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    const fetchUserData = async () => {
      if (session) {
        if (!isEditing && !showSavePrompt) {
          try {
            const res = await axios.get(`/api/user/${session.user.id}`);
            session.user.username = res.data.username;
            setUsername(session.user.username);
            session.user.division = res.data.division;
            setDivision(session.user.division);
            session.user.specialties = res.data.specialties;
            setSpecialties(session.user.specialties);
            session.user.bio = res.data.bio;
            setBio(session.user.bio);
            setEmail(session.user.email);
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
      }
    };

    fetchUserData();
  }, [session, isEditing, showSavePrompt]);

  const handleSpecialtyChange = (specialty: string) => {
    setSpecialties((prevSpecialties) =>
      prevSpecialties.includes(specialty)
        ? prevSpecialties.filter((item) => item !== specialty)
        : [...prevSpecialties, specialty]
    );
  };
  
  const handleSave = async () => {
    if (!session || !session.user) {
      console.error('No session or user data found');
      return;
    }
    const bioWords = bio.trim().split(/\s+/).length;
    const maxBioWords = 50;

    if (bioWords > maxBioWords) {
      setError(`Bio must be less than ${maxBioWords} words`);
      setShowSavePrompt(false);
      return;
    }
    try {
      const response = await axios.put(`/api/user/${session.user.id}`, {
        username,
        bio,
        division,
        specialties,
      });
     
      const updatedUserData = response.data;
      session.user.username = username;
      session.user.bio = bio;
      session.user.division = division;
      session.user.specialties = specialties;
      setUsername(updatedUserData.username);
      setBio(updatedUserData.bio);
      setDivision(updatedUserData.division);
      setSpecialties(updatedUserData.specialties);
      setShowSavePrompt(false);
      setIsEditing(false);
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setError('Username already exists');
      } else {
        setError(error.message || 'An error occurred while saving your data');
        console.error('Error saving user data:', error);
      }
      setShowSavePrompt(false);
    }
  };

  return (
    <><TopNavbar /><div className="settings-shell">
      <SideNavbar selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div className="settings-content">
        {selectedTab === 'profile' && (
          <>
            <span className="eyebrow">THE MIND BEHIND THE BUZZER</span><h1 className="mt-3">Your player card</h1><div className="profile-overview"><Image src="/default.jpg" width={110} height={110} alt="Player avatar" className="rounded-full" /><h2>{username || session?.user.username || "Player"}</h2><span className="pill">{division || "Set your division in account settings"}</span><p className="mt-5">{bio || "Your next great rivalry starts here."}</p><div className="profile-tags">{specialties.map(s => <span key={s} className="pill">{s}</span>)}</div><div className="profile-stats"><div><strong>{session?.user.level || 1}</strong><span>LEVEL</span></div><div><strong>{session?.user.xp || 0}</strong><span>EXPERIENCE</span></div><div><strong>{session?.user.coins || 0}</strong><span>COINS</span></div></div><button className="btn btn-primary" onClick={() => setSelectedTab("account-info")}>Edit player details</button></div>
          </>
        )}
        {selectedTab === 'account-info' && (
          <>
            <h1 className="text-3xl mb-6">Account Information</h1>
            <div className="flex">
              <div className="flex-1 max-w-lg">
                <Input
                  label="Email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  className="cursor-not-allowed"
                />
                <Input
                  label="Username"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing}
                  required
                  className={!isEditing ? 'cursor-not-allowed' : ''}
                />
                <div className="mb-4">
                  <label htmlFor="division" className="block text-xs font-bold mb-2 uppercase">Certamen Division</label>
                  <select
                    id="division"
                    disabled={!isEditing}
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className={`z-0 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      !isEditing ? 'cursor-not-allowed !important disabled:bg-beige-200 disabled:text-gray-700' : ''
                    }`}
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
                  <label className="block text-gray-700 text-xs font-bold mb-2 uppercase">Specialties</label>
                  <div className="flex flex-wrap">
                    {["myth", "history", "literature", "pmaq", "vocab", "grammar", "culture"].map((specialty) => (
                      <div key={specialty} className="flex items-center mr-4">
                        <input
                          type="checkbox"
                          id={`specialty-${specialty}`}
                          checked={specialties.includes(specialty)}
                          onChange={() => handleSpecialtyChange(specialty)}
                          className="mr-1 leading-tight"
                          disabled={!isEditing}
                        />
                        <label htmlFor={`specialty-${specialty}`} className="text-gray-700 text-sm">{specialty.charAt(0).toUpperCase() + specialty.slice(1)}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <Textarea
                  label="Bio"
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'cursor-not-allowed' : ''}
                />

                {error && <p className="text-red-500">{error}</p>}
                <br></br>
                <div className="flex space-x-4">
                  <FormButton
                    text={isEditing ? "Save" : "Change"}
                    onClick={isEditing ? () => setShowSavePrompt(true) : () => setIsEditing(true)}
                    style="bg-indigo-600 text-white w-50% hover:bg-indigo-400"
                  />
                  {isEditing && (
                    <FormButton
                      text="Cancel"
                      onClick={() => setIsEditing(false)}
                      style="bg-gray-600 text-white w-50% hover:bg-gray-400"
                    />
                  )}
                </div>
              </div>
              <div className="w-1/4 ml-10">
                <Image
                  src={"/" + session?.user?.profile + ".jpg" || "/path/to/default-profile-pic.jpg"} // Replace with the actual profile picture path
                  alt="Profile Picture"
                  width={200}
                  height={200}
                  className="rounded-full"
                />
              </div>
            </div>
          </>
        )}
      </div>
      {showSavePrompt && (
        <ConfirmationPopup
          title="Are you sure you want to save changes?"
          message=""
          onConfirm={handleSave}
          onCancel={() => setShowSavePrompt(false)}
        />
      )}

    </div></>
  );
};

export default ProfilePage;


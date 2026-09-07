import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions'; // Adjust the path if necessary
import { encode } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  if (token.id !== id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

  try {
    //console.log(`Fetching user with ID: ${id}`); // Log the ID being fetched
    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      //console.log(`User with ID ${id} not found`); // Log if the user is not found
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { password: _password, ...user } = userDoc.data() || {};
    //console.log(`User data: ${JSON.stringify(user)}`); // Log the user data being returned
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  if (token.id !== id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
  const body = await req.json();
  const { username, bio, division, specialties } = body;

  try {
    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const usernameQuery = await db.collection('users').where('username', '==', username).get();
    if (!usernameQuery.empty && usernameQuery.docs[0].id !== id) {
      return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
    }

    const updatedUser = { username, bio, division, specialties };

    await db.collection('users').doc(id).update(updatedUser);

    const updatedDoc = await db.collection('users').doc(id).get(); // Fetch updated data
    const { password: _password, ...updatedUserData } = updatedDoc.data() || {};
    
    //const session = await getServerSession({ req, authOptions });
    const newToken = await encode({
      token: {
        ...token,
        username: updatedUserData?.username,
        bio: updatedUserData?.bio,
        division: updatedUserData?.division,
        specialties: updatedUserData?.specialties,
      },
      secret: process.env.NEXTAUTH_SECRET as string,
    });
   return NextResponse.json(updatedUserData, { status: 200 });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

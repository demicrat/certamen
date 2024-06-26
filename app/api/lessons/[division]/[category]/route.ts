// app/api/lessons/[division]/[category]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { division: string, category: string } }) {
  let { division, category } = params;

  if (!division || !category) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  division = division.toUpperCase();
  category = category.toLowerCase();

  const lessonsDir = path.join(process.cwd(), `public/lessons/${division}/${category}`);
  if (!fs.existsSync(lessonsDir)) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const lessonFiles = fs.readdirSync(lessonsDir).filter(file => file.endsWith('.md'));
  const totalLessons = lessonFiles.length;

  return NextResponse.json({ totalLessons, lessonFiles });
}

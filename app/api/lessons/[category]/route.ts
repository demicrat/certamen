// app/api/lessons/[division]/[category]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  let { category } = await params;

  if (!/^[a-z0-9-]+$/i.test(category)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  category = category.toLowerCase();

  const lessonsDir = path.join(process.cwd(), `public/lessons/${category}`);
  if (!fs.existsSync(lessonsDir)) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const lessonFiles = fs.readdirSync(lessonsDir).filter(file => file.endsWith('.md')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const totalLessons = lessonFiles.length;

  return NextResponse.json({ totalLessons, lessonFiles });
}

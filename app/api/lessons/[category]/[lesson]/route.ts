import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function GET(req: NextRequest, { params }: { params: Promise<{ category: string, lesson: string }> }) {
  let { category, lesson } = await params;

  if (!/^[a-z0-9-]+$/i.test(category) || !/^[a-z0-9-]+$/i.test(lesson)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  category = category.toLowerCase();

  const filePath = path.join(process.cwd(), `public/lessons/${category}/${lesson}.md`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  const next = String(Number(lesson) + 1);
  const nextLesson = /^\d+$/.test(lesson) && fs.existsSync(path.join(path.dirname(filePath), next + '.md')) ? next : null;
  return NextResponse.json({ ...data, content, nextLesson });
}

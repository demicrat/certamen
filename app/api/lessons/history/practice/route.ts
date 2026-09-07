import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { PracticeCard } from '@/lib/practice';

export async function GET() {
  const directory = path.join(process.cwd(), 'public/lessons/history');
  const cards = fs.readdirSync(directory).filter(file => /^\d+\.md$/.test(file))
    .sort((a, b) => parseInt(a) - parseInt(b)).flatMap(file => {
      const { data } = matter(fs.readFileSync(path.join(directory, file), 'utf8'));
      return (data.practice as PracticeCard[] || []).map(card => ({ ...card, lesson: file.replace('.md', ''), lessonTitle: data.title }));
    });
  return NextResponse.json({ cards });
}

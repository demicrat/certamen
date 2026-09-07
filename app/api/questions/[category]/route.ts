import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const category = (await params).category;
  if (!/^[a-z0-9-]+$/i.test(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  const dir = path.join(process.cwd(), 'public', 'questions', category);

  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const years = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && fs.statSync(path.join(dir, f)).size > 0)
    .map((f) => f.replace('.json', ''));

  return NextResponse.json({ years });
}

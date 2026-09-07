import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import matter from 'gray-matter';
import { dueCards, isCorrect, parseReviews, scheduleReview, type PracticeCard } from '../lib/practice';

const card: PracticeCard = { id: 'test', prompt: 'The queen was ____.', answer: 'Boudicca', aliases: ['Boudica'], explanation: 'Queen of the Iceni.' };
test('recall accepts declared alternatives, accents, case and punctuation without accepting partial answers', () => {
 assert.equal(isCorrect(card, '  BÓUDICA! '), true);
 assert.equal(isCorrect(card, 'Boud'), false); assert.equal(isCorrect(card, ''), false);
});
test('review intervals grow, cap at sixty days, and reset after a miss', () => {
 let review = scheduleReview(undefined, true, 0);
 assert.equal(review.due, 86400000);
 for (const days of [3, 7, 14, 30, 60, 60]) { review = scheduleReview(review, true, 0); assert.equal(review.due, days * 86400000); }
 review = scheduleReview(review, false, 1000); assert.deepEqual(review, { streak: 0, due: 61000 });
 assert.equal(scheduleReview(review, true, 0).due, 86400000);
});
test('due review includes only introduced cards and survives serialization', () => {
 const reviews = parseReviews(JSON.stringify({ test: { due: 10, streak: 0 }, bad: { due: 'today', streak: 0 } }));
 assert.deepEqual(dueCards([card, { ...card, id: 'unseen' }], reviews, 9), []);
 assert.deepEqual(dueCards([card, { ...card, id: 'unseen' }], reviews, 10), [card]);
 assert.equal(reviews.bad, undefined); assert.throws(() => parseReviews('invalid'));
});
test('every history lesson has sourced content and six unique answerable cards', () => {
 const files = fs.readdirSync('public/lessons/history').filter(f => f.endsWith('.md')).sort((a, b) => parseInt(a) - parseInt(b));
 assert.equal(files.length, 23); const ids = new Set<string>();
 files.forEach((file, index) => {
  assert.equal(file, `${index + 1}.md`);
  const { data, content } = matter(fs.readFileSync(`public/lessons/history/${file}`, 'utf8'));
  assert.ok(data.title && data.sourcePages); assert.match(content, /ConnorHarrison.pdf#page=/);
  assert.equal(data.practice.length, 6);
  for (const c of data.practice as PracticeCard[]) {
   assert.equal(ids.has(c.id), false); ids.add(c.id);
   assert.equal(c.prompt.split('____').length, 2); assert.ok(c.explanation);
   assert.equal(isCorrect(c, c.answer), true); assert.ok(content.includes(`**${c.answer}**`));
  }
 });
 assert.equal(ids.size, 138);
});

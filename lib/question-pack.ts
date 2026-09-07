import type { Question } from './competition';
// Original warm-up questions, not an official tournament packet.
const tossups: Question[] = [
  { category: 'Mythology', text: 'This goddess sprang fully armed from the head of Zeus. What Greek goddess is associated with wisdom and the city of Athens?', answer: 'Athena' },
  { category: 'History', text: 'According to Roman tradition, this city was founded in 753 BCE by Romulus. Name the city that became the center of a Mediterranean empire.', answer: 'Rome' },
  { category: 'Latin vocabulary', text: 'The English words aquatic and aquarium come from what Latin noun meaning water?', answer: 'Aqua' },
  { category: 'Literature', text: 'Beginning with the words Arma virumque cano, what epic by Vergil tells of a Trojan hero’s journey to Italy?', answer: 'The Aeneid' },
  { category: 'Mythology', text: 'With help from Ariadne and a thread, what Athenian hero escaped the Labyrinth after killing the Minotaur?', answer: 'Theseus' },
  { category: 'History', text: 'In 44 BCE, Julius Caesar was assassinated on the Ides of which month?', answer: 'March' },
  { category: 'Latin grammar', text: 'In a Latin sentence, which case is most commonly used for the direct object of a transitive verb?', answer: 'Accusative' },
  { category: 'Culture', text: 'In a Roman house, what central hall often contained an impluvium, a shallow basin that collected rainwater?', answer: 'Atrium' },
  { category: 'Mythology', text: 'Condemned to roll a boulder uphill only to watch it fall again, what king is remembered for his endless punishment?', answer: 'Sisyphus' },
  { category: 'Latin vocabulary', text: 'What Latin verb, meaning to carry, gives English the words portable, transport, and import?', answer: 'Porto / portare' },
  { category: 'History', text: 'At the Battle of Zama in 202 BCE, Scipio Africanus defeated what Carthaginian general who had earlier crossed the Alps?', answer: 'Hannibal' },
  { category: 'Literature', text: 'What Roman poet wrote the Metamorphoses, a collection of stories linked by the theme of transformation?', answer: 'Ovid' },
];


// Each pair stays attached to its tossup when the server shuffles the pack.
const bonusPairs: [string, string][][] = [
  [['What bird is commonly associated with Athena?', 'Owl'], ['What Roman goddess corresponds to Athena?', 'Minerva']],
  [['On which hill did Romulus establish his settlement?', 'Palatine'], ['Who was the mother of Romulus and Remus?', 'Rhea Silvia']],
  [['What does the Latin noun terra mean?', 'Earth / land'], ['What does the Latin noun mare mean?', 'Sea']],
  [['Who is the Trojan hero of the Aeneid?', 'Aeneas'], ['What queen of Carthage appears in the Aeneid?', 'Dido']],
  [['Who was the king of Crete associated with the Labyrinth?', 'Minos'], ['Who was the craftsman who built the Labyrinth?', 'Daedalus']],
  [['In what year BCE was Caesar assassinated?', '44 BCE'], ['What river did Caesar cross in 49 BCE?', 'Rubicon']],
  [['Which Latin case commonly indicates possession?', 'Genitive'], ['Which Latin case is used for direct address?', 'Vocative']],
  [['What opening in the atrium roof admitted rainwater?', 'Compluvium'], ['What room was used for dining in a Roman house?', 'Triclinium']],
  [['What Greek god ruled the underworld?', 'Hades'], ['Who was the wife of Hades?', 'Persephone']],
  [['What does the Latin verb amo mean?', 'I love'], ['What does the Latin verb video mean?', 'I see']],
  [['What Numidian king supported Scipio at Zama?', 'Masinissa'], ['At what battle did Hannibal encircle the Roman army in 216 BCE?', 'Cannae']],
  [['Which poet wrote the Aeneid?', 'Vergil / Virgil'], ['In what language did Ovid compose the Metamorphoses?', 'Latin']],
];
export const practicePack: Question[] = tossups.map((question, index) => ({
  ...question,
  bonuses: bonusPairs[index].map(([text, answer]) => ({ category: question.category, text, answer })),
}));

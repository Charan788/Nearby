// Vibe Match scoring system
// Compares two users' vibe answers and returns a compatibility score + shared vibes

export function calculateVibeMatch(myAnswers, theirAnswers) {
  if (!myAnswers?.length || !theirAnswers?.length) return { score: 70, shared: [] }

  const myMap = Object.fromEntries(myAnswers.map(a => [a.question_id, a.answer]))
  const theirMap = Object.fromEntries(theirAnswers.map(a => [a.question_id, a.answer]))

  const allQuestions = [...new Set([...Object.keys(myMap), ...Object.keys(theirMap)])]
  let matches = 0
  const shared = []

  for (const q of allQuestions) {
    if (myMap[q] && theirMap[q]) {
      if (myMap[q] === theirMap[q]) {
        matches++
        shared.push(myMap[q])
      }
    }
  }

  const total = allQuestions.length
  const base = total > 0 ? Math.round((matches / total) * 100) : 70
  // Add some randomness to make it feel more natural (±10%)
  const score = Math.min(99, Math.max(50, base + Math.floor(Math.random() * 20) - 5))

  return { score, shared: shared.slice(0, 3) }
}

export const VIBE_CATEGORIES = [
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'lifestyle', label: 'Lifestyle', emoji: '🌙' },
  { id: 'interests', label: 'Interests', emoji: '🎮' },
]

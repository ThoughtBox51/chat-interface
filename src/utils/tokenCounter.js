/**
 * Approximate token counter for chat messages
 * Uses a simple heuristic: ~4 characters per token (average for English text)
 * For more accurate counting, integrate a proper tokenizer library
 */

export const estimateTokens = (text) => {
  if (!text) return 0
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

export const countMessageTokens = (message) => {
  if (!message || !message.content) return 0
  // Add overhead for role and structure (~10 tokens per message)
  return estimateTokens(message.content) + 10
}

export const countChatTokens = (messages) => {
  if (!messages || messages.length === 0) return 0
  return messages.reduce((total, msg) => total + countMessageTokens(msg), 0)
}

export const formatTokenCount = (count) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export const calculatePercentage = (used, limit) => {
  if (!limit || limit === 0) return 0
  return Math.min(Math.round((used / limit) * 100), 100)
}

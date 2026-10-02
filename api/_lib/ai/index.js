const { answerNative } = require('./native');
const { answerLlama } = require('./llama');
const { SYSTEM_PROMPT } = require('./prompt');

function groqKey() {
  return (process.env.GROQ_API_KEY || '').trim();
}

/** llama (Groq) por padrão; native só se AI_PROVIDER=native. */
function aiProvider() {
  const name = String(process.env.AI_PROVIDER || 'llama').toLowerCase();
  if (name === 'native') return 'native';
  if (name === 'llama' || name === 'groq' || name === 'llm') {
    return groqKey() ? 'llama' : 'native';
  }
  return groqKey() ? 'llama' : 'native';
}

async function runAssistant(opts) {
  if (aiProvider() === 'llama') return answerLlama(opts);
  return answerNative(opts);
}

module.exports = { runAssistant, aiProvider, SYSTEM_PROMPT };

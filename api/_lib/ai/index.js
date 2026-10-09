const { answerNative } = require('./native');
const { answerLlama } = require('./llama');
const { SYSTEM_PROMPT } = require('./prompt');
const { tryCalculate } = require('./dockMath');

function llmKeyReady() {
  return Boolean((process.env.DEEPSEEK_API_KEY || '').trim() || (process.env.GROQ_API_KEY || '').trim());
}

/** native = regras + dados reais, sem API de chat. llama/groq/deepseek só se pedido. */
function aiProvider() {
  const name = String(process.env.AI_PROVIDER || 'native').toLowerCase();
  if (name === 'llama' || name === 'groq' || name === 'deepseek' || name === 'llm') {
    return llmKeyReady() ? 'llama' : 'native';
  }
  return 'native';
}

async function runAssistant(opts) {
  const calc = tryCalculate(opts?.message);
  if (calc) return calc;
  if (aiProvider() === 'llama') return answerLlama(opts);
  return answerNative(opts);
}

module.exports = { runAssistant, aiProvider, SYSTEM_PROMPT };

/** Compatibilidade: o assistente nativo vive em api/_lib/ai. */
const { answerNative } = require('./ai/native');
const { scoreIntent, fold } = require('./ai/intent');

module.exports = { answerNative, scoreIntent, fold };

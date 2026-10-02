const { cors } = require('../_lib/supabaseAdmin');
const { handleAssistant } = require('../_lib/assistantChat');

module.exports = async function handler(req, res) {
  cors(res, req, 'GET,POST,OPTIONS');
  return handleAssistant(req, res);
};

import { getVisionProxyOrigin } from './visionApi';

export function getAssistantChatEndpoint() {
  const base = getVisionProxyOrigin();
  return base ? `${base}/api/ai/chat` : '';
}

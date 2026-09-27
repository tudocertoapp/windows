/** Price atual do plano Business (checkout usa o mapa em api/stripe). */
export const STRIPE_BUSINESS_PRICE_ID = 'price_1TUotUECYmuevOzFX94TbtLm';
export const STRIPE_BUSINESS_PLAN_KEY = 'pe_business';

/** API de checkout em produção (fallback quando .env / localhost não expõem a URL). */
export const DEFAULT_STRIPE_API_ORIGIN = 'https://tudocerto-web.vercel.app';

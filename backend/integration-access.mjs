import {fail} from './validation.mjs';

const publicConfigFields = ['model', 'endpoint', 'phoneId', 'version'];

// Agency ownership and membership roles do not confer platform access.
export function isPlatformAdmin(userId, env = process.env) {
  if (typeof userId !== 'string' || !userId) return false;
  const configuredIds = env?.TRAVELPRO_PLATFORM_ADMIN_IDS;
  if (typeof configuredIds !== 'string') return false;
  return configuredIds.split(',').map(id => id.trim()).filter(Boolean).includes(userId);
}

export function requirePlatformAdmin(userId, env = process.env) {
  if (!isPlatformAdmin(userId, env)) {
    fail(403, 'Esta configuração é gerenciada pela equipe TravelPro.');
  }
  return true;
}

// Project only connection status for agencies. Credentials remain server-side,
// including WhatsApp credentials; channel authorization is a separate journey.
export function integrationView(services, platformAdmin) {
  return services.map(source => {
    const view = {
      service: source.service,
      configured: source.configured === true,
      mode: source.mode,
      verified: source.verified === true,
      management: 'platform'
    };
    if (platformAdmin === true) {
      if (Array.isArray(source.missing)) view.missing = [...source.missing];
      if (source.config && typeof source.config === 'object' && !Array.isArray(source.config)) {
        view.config = Object.fromEntries(publicConfigFields
          .filter(key => typeof source.config[key] === 'string')
          .map(key => [key, source.config[key]]));
      }
    }
    return view;
  });
}

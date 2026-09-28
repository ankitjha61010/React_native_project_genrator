/** DI tokens for values that aren't classes. */
export const DATABASE = Symbol('DATABASE');
/** Repositories + providers (`createInfrastructure`) – tests replace it with in-memory versions. */
export const INFRASTRUCTURE = Symbol('INFRASTRUCTURE');
/** Every application service (`createServices`). */
export const SERVICES = Symbol('SERVICES');

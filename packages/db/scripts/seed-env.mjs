// Preloaded (via `tsx --import`) BEFORE the seed's Prisma client is constructed.
// Seeding writes the GLOBAL content library, which the non-superuser app role
// (`aegis_app`, the runtime DATABASE_URL) is correctly denied. So point the seed's
// connection at the owner role (DIRECT_URL) for the duration of the seed only.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

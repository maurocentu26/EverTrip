import dotenv from 'dotenv';
import { app } from './app';
import { store } from './db/store';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  await store.init();
  app.listen(PORT, () => {
    console.log(`[EverTrip API] Servidor escuchando en http://localhost:${PORT}/v1 (Modo: ${store.getEngineMode()})`);
  });
}

bootstrap().catch((err) => {
  console.error('Error al iniciar EverTrip API:', err);
  process.exit(1);
});

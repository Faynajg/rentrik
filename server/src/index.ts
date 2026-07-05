import { createApp } from "./app";
import { config } from "./lib/config";
import { startScheduler } from "./lib/scheduler";

const app = createApp();

app.listen(config.port, () => {
  console.log(`🟦 Rentrik API escuchando en http://localhost:${config.port}`);
  startScheduler();
});

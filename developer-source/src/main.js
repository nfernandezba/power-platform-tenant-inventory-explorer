import "./styles.css";
import { startApplication } from "./app.js";

startApplication().catch(error => {
  console.error("Application startup failed", error);
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<main class="fatal-error"><h1>Application startup failed</h1><p>${String(error?.message ?? error)}</p></main>`;
  }
});

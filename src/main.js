import { createApp } from "./app.js";
import { LocalStorageAdapter } from "./storage/LocalStorageAdapter.js";

const root = document.getElementById("app");
const storage = new LocalStorageAdapter();
const app = createApp(root, storage);
app.boot();

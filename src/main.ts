import { hydrate, mount } from "svelte";
import "@fontsource/press-start-2p/latin-400.css";
import "./style.css";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Missing application root");
if (import.meta.env.PROD) hydrate(App, { target });
else mount(App, { target });

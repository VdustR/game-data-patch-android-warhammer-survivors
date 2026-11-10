import { render } from "svelte/server";
import App from "./App.svelte";

// Render the same component for every visitor; no crawler-specific content.
export const page = render(App);

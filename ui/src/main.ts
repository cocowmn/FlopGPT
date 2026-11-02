import { mount } from 'svelte';
import App from './App.svelte';
import { WINDOW } from './lib/backend';
import { registerWorker } from './lib/pwa';
import Pane from './Pane.svelte';
import './styles/global.css';

// The desktop app's Settings and editor windows load this page too, and show just that.
mount(WINDOW === 'main' ? App : Pane, { target: document.getElementById('root')! });
if (WINDOW === 'main') registerWorker();

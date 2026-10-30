import { mount } from 'svelte';
import App from './App.svelte';
import { registerWorker } from './lib/pwa';
import './styles/global.css';

mount(App, { target: document.getElementById('root')! });
registerWorker();

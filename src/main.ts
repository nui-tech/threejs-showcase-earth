import './style.scss';
import { Router } from './router/router';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the app
  const app = document.querySelector<HTMLDivElement>('#app')!;
  
  // Initialize the router
  const router = new Router(app);
  
  // Register routes
  router.addRoute('/', HomePage);
  router.addRoute('*', NotFoundPage); // Wildcard route for 404
  
  // Start the router
  router.start();
});
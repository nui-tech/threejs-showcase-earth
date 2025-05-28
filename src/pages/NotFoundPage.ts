import { Page } from '../types/page';

export class NotFoundPage implements Page {
  private element: HTMLElement | null = null;
  
  create(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'not-found';
    
    this.element.innerHTML = `
      <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <a href="/" class="back-button">
          <button>Return Home</button>
        </a>
      </div>
    `;
    
    return this.element;
  }
  
  destroy(): void {
    this.element = null;
  }
  
  getTitle(): string {
    return '404 - Page Not Found';
  }
}
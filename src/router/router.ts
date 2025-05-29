import { Page } from '../types/page';

export class Router {
  private routes: Map<string, Page>;
  private container: HTMLElement;
  private currentPage: Page | null = null;
  
  constructor(container: HTMLElement) {
    this.routes = new Map();
    this.container = container;
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', () => this.handleRouteChange());
    
    // Intercept link clicks for SPA navigation
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href.startsWith(window.location.origin) && !anchor.dataset.external) {
        e.preventDefault();
        this.navigate(anchor.pathname);
      }
    });
  }
  
  // Add a route
  public addRoute(path: string, pageClass: new () => Page): void {
    this.routes.set(path, new pageClass());
  }
  
  // Start the router
  public start(): void {
    this.handleRouteChange();
    this.setupNavHighlighting();
  }
  
  // Navigate to a path
  public navigate(path: string): void {
    window.history.pushState({}, '', path);
    this.handleRouteChange();
    this.setupNavHighlighting();
  }
  
  // Handle route changes
  private handleRouteChange(): void {
    const path = window.location.pathname;
    
    // Find the matching route or use wildcard
    let page = this.routes.get(path);
    
    if (!page) {
      page = this.routes.get('*') || undefined;
    }
    
    if (page) {
      // Cleanup current page if exists
      if (this.currentPage) {
        this.currentPage.destroy();
      }
      
      // Clear the container
      this.container.innerHTML = '';
      
      // Create the new page
      const pageElement = page.create();
      this.container.appendChild(pageElement);
      
      // Set the current page
      this.currentPage = page;
      
      // Update page title
      document.title = page.getTitle();
      
      // Scroll to top
      window.scrollTo(0, 0);
    }
  }
  
  // Set active class on nav links
  private setupNavHighlighting(): void {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav a');
    
    navLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).pathname;
      
      if (href === path) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}
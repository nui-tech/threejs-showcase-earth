import { Page } from '../types/page';
import { Scene3D } from '../3d/Scene3D';

export class HomePage implements Page {
  private element: HTMLElement | null = null;
  private scene: Scene3D | null = null;
  
  create(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'home-page-layout'; // Changed class for the main wrapper

    // Create the content
    this.element.innerHTML = `
      <div class="sidebar left-sidebar"> <!-- Removed 'collapsed' class -->
        <button class="sidebar-toggle left-toggle-btn" aria-label="Toggle left sidebar">
          <span class="toggle-icon">&gt;</span> <!-- Changed icon to indicate it can be collapsed -->
        </button>
        <div class="sidebar-content">
          <h2>Layer</h2>
          <p>Toggle on/off the informational layers</p>
          
          <div class="control-group">
            <label for="show-pole-checkbox">
              <input type="checkbox" id="show-pole-checkbox" checked>
              Show Pole
            </label>
          </div>
          
          <div class="control-group">
            <label for="show-equator-checkbox">
              <input type="checkbox" id="show-equator-checkbox" checked>
              Show Equator
            </label>
          </div>

          <div class="control-group">
            <label for="show-longitude-lines-checkbox">
              <input type="checkbox" id="show-longitude-lines-checkbox" checked>
              Show Longitude
            </label>
          </div>

          <div class="control-group">
            <label for="show-latitude-lines-checkbox">
              <input type="checkbox" id="show-latitude-lines-checkbox" checked>
              Show Latitude
            </label>
          </div>
        </div>
      </div>
      <div class="main-content">
        <div class="container">
          <div class="intro">
            <h1>3D Interactive Experience</h1>
            <p>Explore the 3D scene by rotating, zooming, and panning.</p>
          </div>
          <div class="canvas-container">
            <div id="scene-container"></div>
            <div class="canvas-overlay">
              <p>Click and drag to rotate | Scroll to zoom | Shift+drag to pan</p>
            </div>
          </div>
        </div>
      </div>
      <div class="sidebar right-sidebar collapsed">
        <button class="sidebar-toggle right-toggle-btn" aria-label="Toggle right sidebar">
          <span class="toggle-icon">&gt;</span>
        </button>
        <div class="sidebar-content">
          <h2>Right Sidebar</h2>
          <p>This is the right sidebar content.</p>

          <div class="control-group">
            <label for="show-stats-checkbox">
              <input type="checkbox" id="show-stats-checkbox" checked>
              Show FPS Stats
            </label>
          </div>

          <div class="control-group">
            <label for="show-renderer-info-checkbox">
              <input type="checkbox" id="show-renderer-info-checkbox" checked>
              Show Renderer Info
            </label>
          </div>
        </div>
      </div>
    `;

    // Initialize the 3D scene
    this.initScene();
    // Add event listeners for sidebar toggles
    this.initSidebarToggles();
    // Add event listeners for scene controls
    this.initSceneControls(); // Added call

    return this.element;
  }
  
  destroy(): void {
    // Clean up the 3D scene when page is destroyed
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
    
    this.element = null;
  }
  
  getTitle(): string {
    return '3D Experience | Home';
  }
  
  private initScene(): void {
    if (this.element) {
      const container = this.element.querySelector('#scene-container') as HTMLElement;
      const canvasOverlay = this.element.querySelector('.canvas-overlay') as HTMLElement; // Get overlay element
      
      if (container && canvasOverlay) { // Ensure overlay exists
        const handleFirstInteraction = () => {
          canvasOverlay.style.opacity = '0';

          const onTransitionEnd = () => {
            canvasOverlay.style.display = 'none'; // Hide after fade-out
            canvasOverlay.removeEventListener('transitionend', onTransitionEnd); // Clean up listener
          };
          canvasOverlay.addEventListener('transitionend', onTransitionEnd);
        };

        this.scene = new Scene3D(container, handleFirstInteraction); // Pass callback
        this.scene.initialize();
      }
    }
  }

  private initSidebarToggles(): void {
    if (!this.element) return;

    const leftToggleBtn = this.element.querySelector('.left-toggle-btn');
    const rightToggleBtn = this.element.querySelector('.right-toggle-btn');
    const leftSidebar = this.element.querySelector('.left-sidebar');
    const rightSidebar = this.element.querySelector('.right-sidebar');

    leftToggleBtn?.addEventListener('click', () => {
      leftSidebar?.classList.toggle('collapsed');
      const icon = leftToggleBtn.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = leftSidebar?.classList.contains('collapsed') ? '<' : '>';
      }
    });

    rightToggleBtn?.addEventListener('click', () => {
      rightSidebar?.classList.toggle('collapsed');
      const icon = rightToggleBtn.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = rightSidebar?.classList.contains('collapsed') ? '>' : '<';
      }
    });
  }

  private initSceneControls(): void { // Added method
    if (!this.element || !this.scene) return;

    const poleCheckbox = this.element.querySelector('#show-pole-checkbox') as HTMLInputElement;
    const equatorCheckbox = this.element.querySelector('#show-equator-checkbox') as HTMLInputElement;
    const longitudeLinesCheckbox = this.element.querySelector('#show-longitude-lines-checkbox') as HTMLInputElement; // Added longitude lines checkbox
    const latitudeLinesCheckbox = this.element.querySelector('#show-latitude-lines-checkbox') as HTMLInputElement; // Added latitude lines checkbox
    const statsCheckbox = this.element.querySelector('#show-stats-checkbox') as HTMLInputElement; // Added stats checkbox
    const rendererInfoCheckbox = this.element.querySelector('#show-renderer-info-checkbox') as HTMLInputElement; // Added renderer info checkbox

    poleCheckbox?.addEventListener('change', () => {
      this.scene?.togglePoleVisibility(poleCheckbox.checked);
    });

    equatorCheckbox?.addEventListener('change', () => {
      this.scene?.toggleEquatorVisibility(equatorCheckbox.checked);
    });

    longitudeLinesCheckbox?.addEventListener('change', () => { // Added event listener for longitude lines
      this.scene?.toggleLongitudeLinesVisibility(longitudeLinesCheckbox.checked);
    });

    latitudeLinesCheckbox?.addEventListener('change', () => { // Added event listener for latitude lines
      this.scene?.toggleLatitudeLinesVisibility(latitudeLinesCheckbox.checked);
    });

    statsCheckbox?.addEventListener('change', () => { // Added event listener for stats
      this.scene?.toggleStatsVisibility(statsCheckbox.checked);
    });

    rendererInfoCheckbox?.addEventListener('change', () => { // Added event listener for renderer info
      this.scene?.toggleRendererInfoVisibility(rendererInfoCheckbox.checked);
    });

    // Set initial visibility based on checkboxes
    if (this.scene) { // Ensure scene is available
        this.scene.togglePoleVisibility(poleCheckbox.checked);
        this.scene.toggleEquatorVisibility(equatorCheckbox.checked);
        this.scene.toggleLongitudeLinesVisibility(longitudeLinesCheckbox.checked); // Set initial longitude lines visibility
        this.scene.toggleLatitudeLinesVisibility(latitudeLinesCheckbox.checked); // Set initial latitude lines visibility
        this.scene.toggleStatsVisibility(statsCheckbox.checked); // Set initial stats visibility
        this.scene.toggleRendererInfoVisibility(rendererInfoCheckbox.checked); // Set initial renderer info visibility
    }
  }
}
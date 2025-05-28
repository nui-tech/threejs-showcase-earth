import * as THREE from 'three';
import CameraControls from 'camera-controls';
import Stats from 'stats.js'; // Import Stats.js

export class Scene3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: CameraControls;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cube: THREE.Mesh;
  private clock: THREE.Clock;
  private targetPointMesh: THREE.Mesh;
  private earthMesh: THREE.Mesh;
  private earthSystem: THREE.Group; // Group for Earth, pole, equator, to apply tilt
  private earthPole: THREE.Mesh | null = null;
  private equatorLine: THREE.Mesh | null = null;
  private longitudeLinesGroup: THREE.Group | null = null; // Added for longitude lines
  private latitudeLinesGroup: THREE.Group | null = null; // Added for latitude lines
  private sunMesh: THREE.Mesh | null = null; // Added for Sun model
  private sunLight: THREE.PointLight | null = null; // Added for Sun light
  private stats: Stats | null = null; // Added for Stats.js
  private autoRotateEnabled: boolean = true; // Controls auto-rotation
  private inactivityTimeoutId: number | null = null; // Timer for resuming rotation
  private readonly INACTIVITY_RESUME_DELAY: number = 10000; // 10 seconds
  private firstInteractionDone: boolean = false; // Added to track first interaction

  constructor(container: HTMLElement, private onFirstInteraction?: () => void) { // Added onFirstInteraction callback
    this.container = container;
    
    // Install CameraControls
    CameraControls.install( { THREE: THREE } );
    
    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.earthSystem = new THREE.Group(); // Initialize earthSystem
    // this.scene.background = new THREE.Color(0x111111); // Will be replaced by skybox

    // Skybox
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      '/cube-faces/px.png',
      '/cube-faces/nx.png',
      '/cube-faces/py.png',
      '/cube-faces/ny.png',
      '/cube-faces/pz.png',
      '/cube-faces/nz.png',
    ]);
    this.scene.background = texture;
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
      this.container.clientWidth / this.container.clientHeight || 1, // Initial aspect from container or fallback
      0.1, // Near clipping plane
      100000 // Far clipping plane
    );
    this.camera.position.z = 160;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // Initial size will be set by onContainerResize in initialize()
    // this.renderer.setSize(this.container.clientWidth, this.container.clientHeight); // Set initial size based on container
    this.container.appendChild(this.renderer.domElement);
    
    // Create camera controls
    this.controls = new CameraControls(this.camera, this.renderer.domElement);

    // Event listeners for interaction-based auto-rotation
    this.controls.addEventListener('controlstart', this.handleControlStart);
    this.controls.addEventListener('controlend', this.handleControlEnd);
    
    // Create a cube (placeholder, will be initialized in initialize method)
    this.cube = new THREE.Mesh();
    
    // Create a target point mesh (placeholder, will be initialized in initialize method)
    this.targetPointMesh = new THREE.Mesh();

    // Create an earth mesh (placeholder, will be initialized in initialize method)
    this.earthMesh = new THREE.Mesh();

    // Initialize earthPole and equatorLine to null or placeholder meshes if needed before initialize()
    // For simplicity, we'll ensure they are created in initialize() before being accessed.

    // REMOVED: window.addEventListener('resize', () => this.onWindowResize());
    this.setupResizeObserver(); // ADDED: Setup ResizeObserver

    // Initialize clock for delta time
    this.clock = new THREE.Clock();

    // Initialize Stats.js
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    this.container.appendChild(this.stats.dom);
    // Initially hide it, will be controlled by checkbox
    this.stats.dom.style.display = 'none'; 
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.top = '10px'; // Position from top of container
    this.stats.dom.style.right = '10px'; // Position from right of container
    this.stats.dom.style.left = 'auto'; // Ensure left is not set
    this.stats.dom.style.zIndex = '100'; // Ensure it's on top
    this.stats.dom.style.transform = 'scale(0.5)'; // Scale down by 50%
    this.stats.dom.style.transformOrigin = 'top right'; // Adjust transform origin for scaling
  }

  private setupResizeObserver(): void { // ADDED method
    if (!this.container) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.onContainerResize();
    });
    this.resizeObserver.observe(this.container);
  }
  
  // Method to handle the start of camera control interaction
  private handleControlStart = (): void => {
    this.autoRotateEnabled = false;
    if (this.inactivityTimeoutId !== null) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }

    if (!this.firstInteractionDone && this.onFirstInteraction) {
      this.onFirstInteraction();
      this.firstInteractionDone = true;
    }
  };

  // Method to handle the end of camera control interaction
  private handleControlEnd = (): void => {
    if (this.inactivityTimeoutId !== null) {
      clearTimeout(this.inactivityTimeoutId);
    }
    this.inactivityTimeoutId = window.setTimeout(() => {
      this.autoRotateEnabled = true;
    }, this.INACTIVITY_RESUME_DELAY);
  };
  
  initialize(): void {
    this.onContainerResize(); // ADDED: Call to set initial size correctly

    // Add the earth system group that will be tilted to the scene
    this.scene.add(this.earthSystem);

    // Apply Earth's axial tilt (approx 23.5 degrees)
    // We'll tilt it around the Z-axis, so the North Pole (positive Y) tilts towards positive X.
    // This assumes the initial orientation of the Earth model has its North Pole along the positive Y-axis.
    this.earthSystem.rotation.z = THREE.MathUtils.degToRad(23.5);

    // Add a grid helper for debugging
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    this.scene.add(gridHelper);
    
    // Add an axis helper
    const axisHelper = new THREE.AxesHelper(5);
    this.scene.add(axisHelper);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // Adjusted intensity
    this.scene.add(ambientLight);
    
    // REMOVED: const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    // REMOVED: directionalLight.position.set(5, 5, 5);
    // REMOVED: this.scene.add(directionalLight);

    // Create a single TextureLoader instance
    const textureLoader = new THREE.TextureLoader();

    // Create Sun
    const sunTexture = textureLoader.load('/8k_sun.jpg');
    sunTexture.colorSpace = THREE.SRGBColorSpace;

    const sunGeometry = new THREE.SphereGeometry(50 * 109, 64, 64); // Sun radius 50 * 109
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.position.set(70000, 0, 0); // Position Sun further away
    this.scene.add(this.sunMesh);

    // Create PointLight for the Sun
    this.sunLight = new THREE.PointLight(0xffffff, 500000, 0, 1); // color, intensity, distance, decay
    this.sunLight.position.copy(this.sunMesh.position);
    this.scene.add(this.sunLight);
    
    // Create a cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x007AFF,
      metalness: 0.3,
      roughness: 0.4,
    });
    
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    
    // Create and add target point visualization
    const targetPointGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const targetPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
    this.targetPointMesh = new THREE.Mesh(targetPointGeometry, targetPointMaterial);
    this.scene.add(this.targetPointMesh);

    // Create and add Earth ellipsoid mesh
    const realEquatorialRadius = 6378137; // meters
    const realPolarRadius = 6356752;    // meters
    const scaleFactor = 100000;

    const scaledEquatorialRadius = realEquatorialRadius / scaleFactor;
    const scaledPolarRadius = realPolarRadius / scaleFactor;

    // Create a unit sphere geometry
    const earthGeometry = new THREE.SphereGeometry(1, 200, 200); // Radius 1, 64x64 segments for smoothness
    
    // Load Earth texture
    // const textureLoader = new THREE.TextureLoader(); // This was the redeclaration
    const earthTexture = textureLoader.load('/8081_earthmap10k.jpg'); // Reuse textureLoader
    earthTexture.colorSpace = THREE.SRGBColorSpace; // Important for correct color display

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture, // Apply the loaded texture
      metalness: 0.2,
      roughness: 0.8,
    });
    this.earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);

    // Scale the mesh to form an ellipsoid
    this.earthMesh.scale.set(scaledEquatorialRadius, scaledPolarRadius, scaledEquatorialRadius);
    
    this.earthMesh.position.set(0, 0, 0); // Position at the origin (relative to earthSystem)
    this.earthSystem.add(this.earthMesh); // Add to the tilted earthSystem group

    // Create Longitude Lines
    this.longitudeLinesGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x87CEFA, // Light blue
      transparent: true,
      opacity: 0.5,
    });
    const lineSegments = 64;
    const lineRadius = 1.002; // Slightly above the unit sphere surface

    for (let i = 0; i < 24; i++) { // 24 lines, every 15 degrees
      const longitude = THREE.MathUtils.degToRad(i * 15);
      const points = [];
      for (let j = 0; j <= lineSegments; j++) {
        const latitude = THREE.MathUtils.mapLinear(j, 0, lineSegments, -Math.PI / 2, Math.PI / 2);
        // Points for a semi-ellipse on the sphere
        const x = lineRadius * Math.cos(latitude) * Math.cos(longitude);
        const y = lineRadius * Math.sin(latitude);
        const z = lineRadius * Math.cos(latitude) * Math.sin(longitude);
        points.push(new THREE.Vector3(x, y, z));
      }
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const longitudeLine = new THREE.Line(lineGeometry, lineMaterial);
      this.longitudeLinesGroup.add(longitudeLine);
    }
    this.earthMesh.add(this.longitudeLinesGroup); // Add to earthMesh to inherit rotation and scale


    // Create Latitude Lines
    this.latitudeLinesGroup = new THREE.Group();
    const latitudeLineMaterial = new THREE.LineBasicMaterial({
      color: 0x98FB98, // Light green
      transparent: true,
      opacity: 0.5,
    });
    const latitudeLineSegments = 128; // More segments for smoother circles
    const numLatitudeLines = 17; // e.g., every 10 degrees from -80 to +80, excluding equator

    for (let i = 0; i < numLatitudeLines; i++) {
      // Angle from -80 to +80 degrees, skipping 0 (equator)
      const angleDeg = -80 + i * 10;
      if (angleDeg === 0) continue; // Skip equator as it's already drawn

      const latitude = THREE.MathUtils.degToRad(angleDeg);
      const radiusAtLatitude = lineRadius * Math.cos(latitude); // lineRadius is from longitude lines, slightly above surface
      const yPosition = lineRadius * Math.sin(latitude);

      const points = [];
      for (let j = 0; j <= latitudeLineSegments; j++) {
        const segmentAngle = (j / latitudeLineSegments) * Math.PI * 2;
        const x = radiusAtLatitude * Math.cos(segmentAngle);
        const z = radiusAtLatitude * Math.sin(segmentAngle);
        points.push(new THREE.Vector3(x, yPosition, z));
      }
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const latitudeLine = new THREE.Line(lineGeometry, latitudeLineMaterial);
      this.latitudeLinesGroup.add(latitudeLine);
    }
    this.earthMesh.add(this.latitudeLinesGroup); // Add to earthMesh


    // Create and add North-South pole axis
    const poleRadius = 0.2; // A small radius for the pole
    const poleHeight = scaledPolarRadius * 2 * 1.30; // Slightly taller than the Earth's polar diameter
    const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 8);
    const poleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const earthPole = new THREE.Mesh(poleGeometry, poleMaterial);
    // The cylinder is oriented along the Y-axis by default, which matches the Earth's polar axis.
    // It will be centered at the Earth's origin (0,0,0) by default.
    this.earthSystem.add(earthPole); // Add to the tilted earthSystem group
    this.earthPole = earthPole; // Store reference

    // Create and add Equator line
    const equatorRadius = scaledEquatorialRadius * 1.0002; // Slightly larger than Earth's radius to be visible
    const equatorTubeRadius = 0.1;
    const equatorRadialSegments = 64;
    const equatorTubularSegments = 200;
    const equatorGeometry = new THREE.TorusGeometry(equatorRadius, equatorTubeRadius, equatorRadialSegments, equatorTubularSegments);
    const equatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color for visibility
    const equatorLine = new THREE.Mesh(equatorGeometry, equatorMaterial);
    equatorLine.rotation.x = Math.PI / 2; // Rotate to align with the Earth's equator (around X-axis)
    this.earthSystem.add(equatorLine); // Add to the tilted earthSystem group
    this.equatorLine = equatorLine; // Store reference

    // Prevent camera from zooming too close to the Earth
    if (this.controls) {
      // this.controls.minDistance = scaledEquatorialRadius * 1.1; // Set minDistance to 110% of Earth's equatorial radius
    }
    
    // Start animation loop
    this.animate();
  }
  
  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.stats) {
      this.stats.begin(); // Begin FPS counter
    }
    
    const delta = this.clock.getDelta();
    const target = new THREE.Vector3(); // Create a temporary vector to store the target
    
    if (this.autoRotateEnabled) {
      // Rotate the cube
      if (this.cube) {
        this.cube.rotation.x += 0.01;
        this.cube.rotation.y += 0.01;
      }

      // Rotate the Earth (optional)
      if (this.earthMesh) {
        this.earthMesh.rotation.y += 0.0005; // Slower rotation for Earth
      }
    }
    
    // Update controls
    this.controls.update(delta);
    
    // Update target point mesh position
    if (this.targetPointMesh && this.controls) {
      this.controls.getTarget(target);
      this.targetPointMesh.position.copy(target);
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);

    if (this.stats) {
      this.stats.end(); // End FPS counter
    }
  }
  
  private onContainerResize(): void {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) {
      // Avoid errors if the container is not visible or has no dimensions
      return;
    }

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(width, height);
  }
  
  dispose(): void {
    // Stop animation loop
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Dispose of CameraControls
    this.controls.removeEventListener('controlstart', this.handleControlStart);
    this.controls.removeEventListener('controlend', this.handleControlEnd);
    this.controls.dispose();

    // Clear inactivity timeout
    if (this.inactivityTimeoutId !== null) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }

    // ADDED: Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Dispose of Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        }
      } else if (object instanceof THREE.Line) { // Added for Line Segments
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        }
      }
    });
    
    // Dispose of target point mesh resources
    if (this.targetPointMesh) {
      this.targetPointMesh.geometry.dispose();
      if (this.targetPointMesh.material instanceof THREE.Material) {
        this.targetPointMesh.material.dispose();
      }
    }

    // Dispose of Sun mesh resources
    if (this.sunMesh) {
      if (this.sunMesh.geometry) {
        this.sunMesh.geometry.dispose();
      }
      if (this.sunMesh.material instanceof THREE.MeshBasicMaterial) {
        if (this.sunMesh.material.map) {
          this.sunMesh.material.map.dispose();
        }
        this.sunMesh.material.dispose();
      }
      this.scene.remove(this.sunMesh); // Remove from scene
    }

    // Dispose of Sun light
    if (this.sunLight) {
      this.scene.remove(this.sunLight); // Remove from scene
      this.sunLight.dispose(); // PointLight has a dispose method
    }

    // Dispose of Earth mesh resources
    if (this.earthMesh) {
      this.earthMesh.geometry.dispose();
      if (this.earthMesh.material instanceof THREE.Material) {
        this.earthMesh.material.dispose();
      }
    }

    // Dispose of Earth pole resources
    if (this.earthPole) {
      this.earthPole.geometry.dispose();
      if (this.earthPole.material instanceof THREE.Material) {
        this.earthPole.material.dispose();
      }
    }

    // Dispose of Equator line resources
    if (this.equatorLine) {
      this.equatorLine.geometry.dispose();
      if (this.equatorLine.material instanceof THREE.Material) {
        this.equatorLine.material.dispose();
      }
    }

    // Dispose of Longitude lines resources
    if (this.longitudeLinesGroup) {
      this.longitudeLinesGroup.traverse((object) => {
        if (object instanceof THREE.Line) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          }
        }
      });
      // No need to remove from scene if it's a child of earthMesh which is handled by scene.traverse
    }

    // Dispose of Latitude lines resources
    if (this.latitudeLinesGroup) {
      this.latitudeLinesGroup.traverse((object) => {
        if (object instanceof THREE.Line) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          }
        }
      });
    }

    // Remove Stats.js DOM element
    if (this.stats && this.stats.dom.parentNode) {
      this.stats.dom.parentNode.removeChild(this.stats.dom);
      this.stats = null;
    }
    
    // Remove renderer from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    // Dispose of renderer
    this.renderer.dispose();
    
    // REMOVED: window.removeEventListener('resize', () => this.onWindowResize());
  }

  // Method to toggle Earth's pole visibility
  public togglePoleVisibility(visible: boolean): void {
    if (this.earthPole) {
      this.earthPole.visible = visible;
    }
  }

  // Method to toggle Equator line visibility
  public toggleEquatorVisibility(visible: boolean): void {
    if (this.equatorLine) {
      this.equatorLine.visible = visible;
    }
  }

  // Method to toggle Longitude lines visibility
  public toggleLongitudeLinesVisibility(visible: boolean): void {
    if (this.longitudeLinesGroup) {
      this.longitudeLinesGroup.visible = visible;
    }
  }

  public toggleLatitudeLinesVisibility(visible: boolean): void {
    if (this.latitudeLinesGroup) {
      this.latitudeLinesGroup.visible = visible;
    }
  }

  public toggleStatsVisibility(visible: boolean): void { // Added method
    if (this.stats) {
      this.stats.dom.style.display = visible ? 'block' : 'none';
    }
  }
}
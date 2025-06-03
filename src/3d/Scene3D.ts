import * as THREE from 'three';
import CameraControls from 'camera-controls';
import Stats from 'stats.js'; // Import Stats.js
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/Addons.js';


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
  private rendererInfoDiv: HTMLDivElement | null = null; // Added for renderer info
  private autoRotateEnabled: boolean = true; // Controls actual auto-rotation
  private autoRotateAllowed: boolean = true; // Tracks if user wants auto-rotation (checkbox)
  private inactivityTimeoutId: number | null = null; // Timer for resuming rotation
  private readonly INACTIVITY_RESUME_DELAY: number = 10000; // 10 seconds
  private firstInteractionDone: boolean = false; // Added to track first interaction
  private debugInfoDiv: HTMLDivElement | null = null;
  private debugInfoVisible: boolean = false;
  private labelRenderer: CSS2DRenderer | undefined; // Renderer for CSS2DObjects
  private equatorLabel: CSS2DObject | null = null; // Equator label
  private equatorRadius: number = 0; // Store equator radius for label logic
  private primeMeridianLine: THREE.Mesh | null = null;
  private primeMeridianGroup: THREE.Group | null = null;
  private antimeridianLine: THREE.Mesh | null = null;

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
    this.stats.dom.style.transformOrigin = 'top right'; // Adjust transform origin for scaling

    // Initialize Renderer Info Div
    this.rendererInfoDiv = document.createElement('div');
    this.rendererInfoDiv.style.position = 'absolute';
    this.rendererInfoDiv.style.top = '60px';
    this.rendererInfoDiv.style.right = '10px';
    this.rendererInfoDiv.style.color = 'white';
    this.rendererInfoDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    this.rendererInfoDiv.style.padding = '5px';
    this.rendererInfoDiv.style.fontFamily = 'Arial, sans-serif';
    this.rendererInfoDiv.style.fontSize = '10px'; // Will be affected by scale
    this.rendererInfoDiv.style.zIndex = '100';
    this.rendererInfoDiv.style.display = 'none'; // Initially hidden
    this.rendererInfoDiv.style.transformOrigin = 'top right'; // Adjust transform origin
    this.container.appendChild(this.rendererInfoDiv);

    // Initialize Debug Info Div
    this.debugInfoDiv = document.createElement('div');
    this.debugInfoDiv.style.position = 'absolute';
    this.debugInfoDiv.style.top = '10px';
    this.debugInfoDiv.style.left = '10px';
    this.debugInfoDiv.style.background = '#0a181e';
    this.debugInfoDiv.style.color = '#bfcbd6';
    this.debugInfoDiv.style.fontFamily = 'monospace';
    this.debugInfoDiv.style.fontSize = '18px';
    this.debugInfoDiv.style.padding = '0';
    this.debugInfoDiv.style.display = 'none';
    this.debugInfoDiv.style.zIndex = '200';
    this.debugInfoDiv.style.borderRadius = '2px';
    this.debugInfoDiv.style.overflow = 'hidden';
    this.container.appendChild(this.debugInfoDiv);
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
    // Only resume auto-rotation if user wants it (checkbox is checked)
    if (this.autoRotateAllowed) {
      this.inactivityTimeoutId = window.setTimeout(() => {
        this.autoRotateEnabled = true;
      }, this.INACTIVITY_RESUME_DELAY);
    }
  };
  
  initialize(): void {
    this.onContainerResize(); // ADDED: Call to set initial size correctly

    // Add the earth system group that will be tilted to the scene
    this.scene.add(this.earthSystem);

    // Apply Earth's axial tilt (approx 23.5 degrees)
    // We'll tilt it around the Z-axis, so the North Pole (positive Y) tilts towards positive X.
    // This assumes the initial orientation of the Earth model has its North Pole along the positive Y-axis.
    // TODO: tilt back here
    // this.earthSystem.rotation.z = THREE.MathUtils.degToRad(23.5);

    // Add a grid helper for debugging
    const gridHelper = new THREE.GridHelper(500, 100, 0x888888, 0x444444);
    this.scene.add(gridHelper);
    
    // Add an axis helper
    const axisHelper = new THREE.AxesHelper(120);
    this.scene.add(axisHelper);

    // Add XYZ labels to the ends of the axes
    const axisLabels = [
      { text: 'X', color: 'red', position: new THREE.Vector3(120, 0, 0) },
      { text: 'Y', color: 'green', position: new THREE.Vector3(0, 120, 0) },
      { text: 'Z', color: 'blue', position: new THREE.Vector3(0, 0, 120) },
    ];
    axisLabels.forEach(({ text, color, position }) => {
      const labelDiv = document.createElement('div');
      labelDiv.textContent = text;
      labelDiv.style.color = color;
      labelDiv.style.fontWeight = 'bold';
      labelDiv.style.fontSize = '26px';
      labelDiv.style.textShadow = '0 0 4px #000, 0 0 2px #000';
      labelDiv.style.pointerEvents = 'none';
      labelDiv.style.userSelect = 'none';
      const labelObj = new CSS2DObject(labelDiv);
      labelObj.position.copy(position);
      axisHelper.add(labelObj);
    });
    
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
    const latitudeLineSegments = 256; // More segments for smoother circles
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
    this.equatorRadius = equatorRadius; // Store for use in animate()
    const equatorTubeRadius = 0.1;
    const equatorRadialSegments = 64;
    const equatorTubularSegments = 200;
    const equatorGeometry = new THREE.TorusGeometry(equatorRadius, equatorTubeRadius, equatorRadialSegments, equatorTubularSegments);
    const equatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color for visibility
    const equatorLine = new THREE.Mesh(equatorGeometry, equatorMaterial);
    equatorLine.rotation.x = Math.PI / 2; // Rotate to align with the Earth's equator (around X-axis)
    this.earthSystem.add(equatorLine); // Add to the tilted earthSystem group
    this.equatorLine = equatorLine; // Store reference

    // --- Equator Label ---
    const equatorLabelDiv = document.createElement('div');
    equatorLabelDiv.className = 'equator-label';
    equatorLabelDiv.textContent = 'Equator';
    equatorLabelDiv.style.color = 'yellow';
    equatorLabelDiv.style.fontWeight = 'bold';
    equatorLabelDiv.style.fontSize = '18px';
    equatorLabelDiv.style.textShadow = '0 0 4px #000, 0 0 2px #000';
    equatorLabelDiv.style.pointerEvents = 'none';
    equatorLabelDiv.style.userSelect = 'none';
    // Place the label at (equatorRadius, 0, 0) in the local space of the equator line
    const equatorLabelObj = new CSS2DObject(equatorLabelDiv);
    // Initial position, will be updated each frame
    equatorLabelObj.position.set(equatorRadius, 0, 0);
    equatorLine.add(equatorLabelObj); // Add label as child of equator line
    this.equatorLabel = equatorLabelObj;

    // Create and add Antimeridian line (longitude 180°)
    const antimeridianMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0E0 }); // Same yellow as equator
    const antimeridianRadius = scaledEquatorialRadius * 1.0002; // Match equator radius
    const antimeridianTubeRadius = 0.1; // Make the Antimeridian line much thicker
    const antimeridianRadialSegments = 64;
    const antimeridianTubularSegments = 200;
    // TorusGeometry: (radius, tube, radialSegments, tubularSegments, arc)
    // For Antimeridian, arc = PI (half circle), then rotate to XZ plane
    const antimeridianGeometry = new THREE.TorusGeometry(antimeridianRadius, antimeridianTubeRadius, antimeridianRadialSegments, antimeridianTubularSegments, Math.PI);
    const antimeridianLine = new THREE.Mesh(antimeridianGeometry, antimeridianMaterial);
    antimeridianLine.rotation.z = Math.PI / 2;
    this.earthSystem.add(antimeridianLine);
    this.antimeridianLine = antimeridianLine;

    // --- Prime Meridian Group (with simple label) ---
    // Create Prime Meridian group
    const primeMeridianGroup = new THREE.Group();
    // Create Prime Meridian line (longitude 0°)
    const primeMeridianMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow, same as equator
    const primeMeridianRadius = scaledEquatorialRadius * 1.0002; // Match equator radius
    const primeMeridianTubeRadius = 0.1;
    const primeMeridianRadialSegments = 64;
    const primeMeridianTubularSegments = 200;
    // TorusGeometry: (radius, tube, radialSegments, tubularSegments, arc)
    // For Prime Meridian, arc = PI (half circle), then rotate to XZ plane
    const primeMeridianGeometry = new THREE.TorusGeometry(primeMeridianRadius, primeMeridianTubeRadius, primeMeridianRadialSegments, primeMeridianTubularSegments, Math.PI);
    const primeMeridianLine = new THREE.Mesh(primeMeridianGeometry, primeMeridianMaterial);
    primeMeridianLine.rotation.z = -Math.PI / 2; // Opposite side of antimeridian
    primeMeridianGroup.add(primeMeridianLine);

    // Add a simple label for the Prime Meridian
    const primeMeridianLabelDiv = document.createElement('div');
    primeMeridianLabelDiv.className = 'prime-meridian-label';
    primeMeridianLabelDiv.textContent = 'Prime Meridian';
    primeMeridianLabelDiv.style.color = 'yellow';
    primeMeridianLabelDiv.style.fontWeight = 'bold';
    primeMeridianLabelDiv.style.fontSize = '16px';
    primeMeridianLabelDiv.style.textShadow = '0 0 4px #000, 0 0 2px #000';
    primeMeridianLabelDiv.style.pointerEvents = 'none';
    primeMeridianLabelDiv.style.userSelect = 'none';
    const primeMeridianLabelObj = new CSS2DObject(primeMeridianLabelDiv);
    // Place the label at the top of the arc (0, radius, 0) in group local space
    primeMeridianLabelObj.position.set(0, primeMeridianRadius , 0);
    primeMeridianGroup.add(primeMeridianLabelObj);

    this.earthSystem.add(primeMeridianGroup);
    this.primeMeridianLine = primeMeridianLine;
    this.primeMeridianGroup = primeMeridianGroup;

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

      // Rotate the Earth system (rotates all children, including lines)
      if (this.earthSystem) {
        this.earthSystem.rotation.y += 0.0005;
      }
    }
    
    // Update controls
    this.controls.update(delta);
    
    // Update target point mesh position
    if (this.targetPointMesh && this.controls) {
      this.controls.getTarget(target);
      this.targetPointMesh.position.copy(target);
    }
    
    // Move equator label to closest point on equator to camera (projected onto equator circle)
    if (this.equatorLabel && this.equatorLine && this.camera) {
      // Equator is a torus centered at (0,0,0), lying in XZ plane (after rotation.x = PI/2)
      // Get camera position in world space, convert to equatorLine local space
      const cameraWorldPos = new THREE.Vector3();
      this.camera.getWorldPosition(cameraWorldPos);
      // Convert camera position to equatorLine local space
      const equatorWorldMatrix = this.equatorLine.matrixWorld;
      const equatorWorldMatrixInv = new THREE.Matrix4().copy(equatorWorldMatrix).invert();
      const cameraLocal = cameraWorldPos.clone().applyMatrix4(equatorWorldMatrixInv);
      // Project onto equator circle (XY plane, radius = equatorRadius)
      const angle = Math.atan2(cameraLocal.y, cameraLocal.x);
      const x = this.equatorRadius * Math.cos(angle);
      const y = this.equatorRadius * Math.sin(angle);
      this.equatorLabel.position.set(x, y, 0);
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    // Render CSS2D labels (equator label)
    if (!this.labelRenderer) {
      this.labelRenderer = new CSS2DRenderer();
      this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.labelRenderer.domElement.style.position = 'absolute';
      this.labelRenderer.domElement.style.top = '0';
      this.labelRenderer.domElement.style.left = '0';
      this.labelRenderer.domElement.style.pointerEvents = 'none';
      this.labelRenderer.domElement.style.zIndex = '10';
      this.container.appendChild(this.labelRenderer.domElement);
    }
    this.labelRenderer.render(this.scene, this.camera);

    if (this.stats) {
      this.stats.end(); // End FPS counter
    }

    // Update Renderer Info
    if (this.rendererInfoDiv && this.rendererInfoDiv.style.display !== 'none') {
      const info = this.renderer.info;
      this.rendererInfoDiv.innerHTML = `
        Geometries: ${info.memory.geometries}<br>
        Textures: ${info.memory.textures}<br>
        Draw Calls: ${info.render.calls}<br>
        Triangles: ${info.render.triangles}
      `;
    }

    // Update Debug Info UI
    if (this.debugInfoDiv && this.debugInfoVisible) {
      const info = this.renderer.info;
      this.debugInfoDiv.innerHTML = `
        <div style="display:flex;align-items:stretch;">
          <div style="background:#07111a;color:#6cf;min-width:80px;padding:0 8px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:22px;font-weight:bold;">${Math.round(this.stats?.dom.children[0]?.textContent ? parseFloat(this.stats.dom.children[0].textContent) : 0)} FPS</div>
          </div>
          <div style="background:#142a1a;color:#7f7;padding:0 8px;min-width:90px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:16px;">${(this.stats as any)?.dom.children[1]?.textContent || ''}</div>
          </div>
          <div style="background:#2a2a14;color:#ff7;padding:0 8px;min-width:90px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:16px;">${(this.stats as any)?.dom.children[2]?.textContent || ''}</div>
          </div>
          <div style="background:#0a181e;color:#bfcbd6;padding:0 12px;min-width:170px;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:15px;font-weight:bold;">INFO</div>
            <div style="font-size:14px;">Calls <b>${info.render.calls}</b> &nbsp; Lines <b>${info.render.lines || 0}</b></div>
            <div style="font-size:14px;">Tris <b>${(info.render.triangles/1000).toFixed(2)}k</b> &nbsp; Points <b>${info.render.points || 0}</b></div>
          </div>
        </div>
      `;
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

    // Update label renderer size
    if (this.labelRenderer) {
      this.labelRenderer.setSize(width, height);
    }
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

    // Remove Renderer Info Div
    if (this.rendererInfoDiv && this.rendererInfoDiv.parentNode) {
      this.rendererInfoDiv.parentNode.removeChild(this.rendererInfoDiv);
      this.rendererInfoDiv = null;
    }
    
    // Remove Debug Info Div
    if (this.debugInfoDiv && this.debugInfoDiv.parentNode) {
      this.debugInfoDiv.parentNode.removeChild(this.debugInfoDiv);
      this.debugInfoDiv = null;
    }
    
    // Remove renderer from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    // Dispose of renderer
    this.renderer.dispose();
    
    // Remove label renderer
    if (this.labelRenderer && this.labelRenderer.domElement.parentNode) {
      this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
      this.labelRenderer = undefined;
    }
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

  public toggleRendererInfoVisibility(visible: boolean): void {
    if (this.rendererInfoDiv) {
      this.rendererInfoDiv.style.display = visible ? 'block' : 'none';
    }
  }

  public toggleAutoRotate(enabled: boolean): void {
    this.autoRotateAllowed = enabled;
    this.autoRotateEnabled = enabled;
  }

  public toggleDebugInfo(visible: boolean): void {
    this.debugInfoVisible = visible;
    if (this.debugInfoDiv) {
      this.debugInfoDiv.style.display = visible ? 'block' : 'none';
    }
  }

  // Method to toggle Prime Meridian visibility
  public togglePrimeMeridianVisibility(visible: boolean): void {
    if (this.primeMeridianGroup) {
      this.primeMeridianGroup.visible = visible;
    }
  }

  // Method to toggle Antimeridian visibility
  public toggleAntimeridianVisibility(visible: boolean): void {
    if (this.antimeridianLine) {
      this.antimeridianLine.visible = visible;
    }
  }
}
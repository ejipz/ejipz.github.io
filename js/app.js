const ROOM_W = 22, ROOM_D = 18, WALL_H = 8;

// vars are declared with let so other scripts can access them 
let scene, camera, renderer, clock;
let player, playerBody, playerParts = null;
let backWall, frontWall, rightWall, leftWall, ceiling;
let hemiLight, sunLight, fillLight; 
let windowViewMeshes = []; 
let pendantLights = [], pendantBulbs = []; 

let collidables = []; 
const interactables = []; 
const sittables = []; 

let hovered = null;
let walkPhase = 0, walkAmount = 0;
let lastFootstepIndex = -1;
let lastSatChairEntry = null, lastStandUpTime = -9999;
let seated = null;        
let seatTweenActive = false;
let seatTween = null;

let camYaw = 0.35, camPitch = 0.2, camDist = 7.2;
const EYE_H = 1.5;

const keys = {};
let dragging = false, dragButton = null, lastX = 0, lastY = 0;
let moveVec = { x:0, y:0 }; // touch joystick
let touchMoveId = null, touchLookId = null;
let touchStart = {x:0,y:0};

// detect device
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

async function init(){
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d1f1c, 14, 34);

  // 55 degrees, anything closer than 0.1 or farther than 100 isnt rendered
  camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // enable shadow maps to cast shadows on objs
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // softer shadow
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.getElementById('canvas-wrap').appendChild(renderer.domElement);

  clock = new THREE.Clock();

  buildLights();
  buildRoom();
  
  // generate one shared window view then loop over coordinate arrays to place the windows on the front and side walls
  const initialSky = makeSkyTexture('#bfe3f0','#eaf6f5','#fff2d6', false);
  [4, -3].forEach(x => buildWindow(x, 3.1, ROOM_D/2, Math.PI, initialSky));
  [3.5, -3.5].forEach(z => buildWindow(-ROOM_W/2, 3.1, z, Math.PI/2, initialSky));
  buildDecor();

  buildCatalogKiosk(7.5, -8.4, 0);
  buildPlayer();

  await loadLibrary();

  // bookshelves
  buildBookshelf({
    key:'projects', label:'PROJECTS', x:10.6, z:3.6, rotY:-Math.PI/2,
    data: LIBRARY.projects
  });

  buildBookshelf({
    key:'certificates', label:'ACHIEVEMENTS', x:10.6, z:-3.5, rotY:-Math.PI/2,
    data: LIBRARY.certificates
  });

  buildBookshelf({
    key:'experience', label:'EXPERIENCE', x:1.5, z:-8.4, rotY:0,
    data: LIBRARY.experience
  });

  buildBookshelf({
    key:'about', label:'ABOUT ME', x:-7, z:-8.4, rotY:0,
    data: LIBRARY.about
  });

  player.position.set(0, 0, 1.0);
  camYaw = 0.15;

  // call applyTimeOfDay every 5 mins to check the real-world time and sync the in-game windows and lights
  applyTimeOfDay();
  setInterval(applyTimeOfDay, 5*60*1000);

  window.addEventListener('resize', onResize);
  bindInput();
  bindCatalog();

  // used to make the loading spinner disappear smoothly
  document.getElementById('loading').style.opacity = '0';
  setTimeout(()=> document.getElementById('loading').style.display='none', 500);

  // decides which type of instruction to show
  if(isTouchDevice){
    document.getElementById('instructions').style.display = 'none';
  } else {
    // shows desktop instructions temporarily
    setTimeout(()=> document.getElementById('instructions').classList.add('fade'), 6000);

    // hide mobile instructions
    document.getElementById('touch-move-hint').style.display = 'none';
    document.getElementById('touch-look-hint').style.display = 'none';
  }
}

// start the experience
// builds the scene then starts the render loop in loop.js once init returns a promise
init().then(animate); 
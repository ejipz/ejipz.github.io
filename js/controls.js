
function bindInput(){
  // listen for the first click/tap so the audio can be played
  // once:true automatically removes a listener after it is triggered once
  window.addEventListener('keydown', unlockAudio, { once:true });
  window.addEventListener('pointerdown', unlockAudio, { once:true });
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  const dom = renderer.domElement;

  // look around
  dom.addEventListener('mousedown', e => {
    dragging = true; 

    // records the starting cursor position
    lastX = e.clientX; 
    lastY = e.clientY;

    // reset the distance moved to 0
    dragMoved = 0;
  });

  window.addEventListener('mouseup', e => {
    // if the user was dragging the mouse and barely moved, treat it as a click
    if(dragging && dragMoved < 6) { 
      tryClick(e.clientX, e.clientY); 
    }

    dragging = false;
  });

  window.addEventListener('mousemove', e => {
    if(dragging){
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      dragMoved += Math.abs(dx)+Math.abs(dy);
      
      // adjust camera 
      camYaw -= dx * 0.006;
      camPitch = clamp(camPitch - dy*0.004, 0.15, 1.35);

      lastX = e.clientX; lastY = e.clientY;
    }

    checkHover(e.clientX, e.clientY);
  });

  // touch
  // left half = move, right half = look
  dom.addEventListener('touchstart', e => {
    for(const t of e.changedTouches){
      if(t.clientX < window.innerWidth/2 && touchMoveId===null) {
        // assign a unique id to the finger
        touchMoveId = t.identifier; 
        touchStart = {x:t.clientX, y:t.clientY};
      } else if(touchLookId===null) {
        touchLookId = t.identifier; 
        lastX = t.clientX; lastY = t.clientY;
      }
    }
  }, {passive:true});

  dom.addEventListener('touchmove', e => {
    for(const t of e.changedTouches) {
      // move finger
      if(t.identifier === touchMoveId){
        // how far the finger has moved from its initial position
        let dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;

        // straight line
        // reaches full strength when the user has dragged 50px away
        const mag = Math.min(1, Math.hypot(dx,dy)/50);

        // get the angle of the drag direction
        const ang = Math.atan2(dy,dx);

        moveVec.x = Math.cos(ang)*mag; 
        moveVec.y = Math.sin(ang)*mag;
      } 
      // look finger
      else if (t.identifier === touchLookId) {
        const dx = t.clientX - lastX, dy = t.clientY - lastY;
        camYaw -= dx * 0.006;
        camPitch = clamp(camPitch - dy*0.004, 0.15, 1.35);
        lastX = t.clientX; lastY = t.clientY;
      }
    }
  }, {passive:true});

  // when a finger is lifted, free the finger id and reset the movement vector
  dom.addEventListener('touchend', e => {
    for(const t of e.changedTouches) {
      if(t.identifier === touchMoveId) { 
        touchMoveId = null; 
        moveVec = {x:0,y:0};
      }
      if(t.identifier === touchLookId){
        touchLookId = null;

        // show a tag after a mobile device user taps on smth 
        checkHover(t.clientX, t.clientY);
        tryClick(t.clientX, t.clientY);
        scheduleTouchHintHide();
      }
    }
  }, {passive:true});

  // close modal
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => { if(e.target.id==='modalBackdrop') closeModal(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeModal(); closeCatalog(); } });

  // teleport buttons
  document.querySelectorAll('.dock-btn').forEach(btn => {
    btn.addEventListener('click', () => teleportTo(btn.dataset.shelf));
  });

  // mute button
  document.getElementById('muteBtn').addEventListener('click', () => {
    const isMuted = toggleMute();
    document.getElementById('muteIconOn').style.display = isMuted ? 'none' : '';
    document.getElementById('muteIconOff').style.display = isMuted ? '' : 'none';
  });
}

let dragMoved = 0;
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); } // used to force a value to stay within a range

// shoots an invisible line from the camera and reports what it hits
const raycaster = new THREE.Raycaster();

function tryClick(clientX, clientY) {
  // normalise coordinates
  const mouse = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);

  // if the player is currently seated and clicks on the chair, the player stands up
  if(seated && !seatTweenActive){
    const chairHits = raycaster.intersectObjects(seated.entry.meshes);
    if(chairHits.length) standUp();
    return;
  }

  const bookHits = raycaster.intersectObjects(interactables.map(o=>o.mesh));

  const canSit = !seated && !seatTweenActive;
  const sitMeshes = canSit ? sittables.flatMap(s => s.meshes) : [];
  const sitHits = sitMeshes.length ? raycaster.intersectObjects(sitMeshes) : [];

  // pick the hit closest to the ray
  const bookDist = bookHits.length ? bookHits[0].distance : Infinity;
  const sitDist = sitHits.length ? sitHits[0].distance : Infinity;

  // if a book hit is the closest
  if(bookDist < sitDist){
    const hit = interactables.find(o=>o.mesh===bookHits[0].object);

    if(hit){
      if (hit.onClick) hit.onClick();
      else openModal(hit.sectionKey, hit.index);
    }

    return;
  }

  // if the chair hit was closer
  if(sitHits.length){
    const entry = sittables.find(s => s.meshes.includes(sitHits[0].object));
    if(entry) sitDown(entry);
  }
}

// clears the hint that appears when a user clicks on a book after a while
let hintHideTimer = null;
function scheduleTouchHintHide(){
  if(hintHideTimer) clearTimeout(hintHideTimer);
  hintHideTimer = setTimeout(()=> document.getElementById('crosshair-hint').classList.remove('show'), 1200);
}

function checkHover(clientX, clientY){
  // cancel any hide timer
  if(hintHideTimer) { clearTimeout(hintHideTimer); hintHideTimer = null; }

  const mouse = new THREE.Vector2(
    (clientX/window.innerWidth)*2-1,
    -(clientY/window.innerHeight)*2+1
  );
  raycaster.setFromCamera(mouse, camera);
  const hintEl = document.getElementById('crosshair-hint');

  // hovering over a chair while a player is seated shows a hint
  if(seated && !seatTweenActive){
    if(hovered) { if(hovered.userData.baseX !== undefined) hovered.position.x = hovered.userData.baseX; hovered = null; }
    
    const chairHits = raycaster.intersectObjects(seated.entry.meshes);
    
    if(chairHits.length){
      document.getElementById('hintText').textContent = 'Click to stand';
      hintEl.style.left = clientX+'px'; hintEl.style.top = clientY+'px';
      hintEl.classList.add('show');
    } else {
      hintEl.classList.remove('show');
    }
    return;
  }

  // sliding effect when book is hovered
  const bookHits = raycaster.intersectObjects(interactables.map(o=>o.mesh));
  const canSit = !seated && !seatTweenActive;
  const sitMeshes = canSit ? sittables.flatMap(s => s.meshes) : [];
  const sitHits = sitMeshes.length ? raycaster.intersectObjects(sitMeshes) : [];

  const bookDist = bookHits.length ? bookHits[0].distance : Infinity;
  const sitDist = sitHits.length ? sitHits[0].distance : Infinity;

  if(bookDist < sitDist){
    const obj = bookHits[0].object;
    if(hovered !== obj){
      if(hovered && hovered.userData.baseX !== undefined) hovered.position.x = hovered.userData.baseX;
      hovered = obj;
    }

    // hovered.userData.baseX !== undefined ensures the effect only applies to books
    if(hovered.userData.baseX !== undefined) hovered.position.x = hovered.userData.baseX + 0.06;

    // determines what the tooltip text should show
    const found = interactables.find(o=>o.mesh===obj);
    const label = found.hoverText || (found.sectionKey ? LIBRARY[found.sectionKey].books[found.index].title : '');
    document.getElementById('hintText').textContent = label;
    hintEl.style.left = clientX+'px'; hintEl.style.top = clientY+'px';
    hintEl.classList.add('show');
    return;
  }

  // clear book hover effect
  if(hovered) { if(hovered.userData.baseX !== undefined) hovered.position.x = hovered.userData.baseX; hovered = null; }

  // hides the chair tooltip hint if the user is no longer hovering over a chair
  if(sitHits.length) {
    document.getElementById('hintText').textContent = 'Click to sit';
    hintEl.style.left = clientX+'px'; hintEl.style.top = clientY+'px';
    hintEl.classList.add('show');
    return;
  }

  hintEl.classList.remove('show');
}

// teleport buttons
// yaw ensures the camera faces the shelf
// facing is which direction the player turns
const shelfAnchors = {
  projects:     { x:7.2, z:3.6,  yaw: -Math.PI/2, facing: Math.PI/2 },
  certificates: { x:7.2, z:-3.5, yaw: -Math.PI/2, facing: Math.PI/2 },
  experience:   { x:1.5, z:-4.5, yaw: 0,          facing: Math.PI },
  about:        { x:-6,  z:-4.5, yaw: 0,          facing: Math.PI }
};

const STAND_POSE = { leg:0, arm:0, torso:0 };
const SEAT_POSE  = { leg:-1.25, arm:-0.2, torso:-0.04 };

function applyBlendedPose(e, fromPose, toPose){
  if(!playerParts) return;

  // fromPose: e = 0, toPose: e = 1
  const leg = fromPose.leg + (toPose.leg - fromPose.leg) * e;
  const arm = fromPose.arm + (toPose.arm - fromPose.arm) * e;
  const torso = fromPose.torso + (toPose.torso - fromPose.torso) * e;

  playerParts.legL.rotation.x = leg;
  playerParts.legR.rotation.x = leg;
  playerParts.armL.rotation.x = arm;
  playerParts.armR.rotation.x = arm;
  playerParts.torso.rotation.x = torso;
}

// player sits on a chair
function sitDown(entry){
  if(seated || seatTweenActive) return;

  seatTweenActive = true;

  // records where the player was standing and which way they were facing before sitting
  // .clone() was used as three.js vectors are mutable
  seated = { standPos: player.position.clone(), standFacing: playerBody.rotation.y, entry };
  
  // set up the animation's start and end values
  const from = player.position.clone();
  const to = new THREE.Vector3(entry.seatPos.x, entry.rideHeight, entry.seatPos.z);

  // entry.seatFacing + Math.PI adds 180 deg to the direction the player is facing
  // ensures the camera faces the same direction as the user
  const startYaw = camYaw, endYaw = entry.seatFacing + Math.PI;
  const startFacing = playerBody.rotation.y;

  let facingDiff = entry.seatFacing - startFacing;
  facingDiff = Math.atan2(Math.sin(facingDiff), Math.cos(facingDiff)); // ensures the player turns the short way

  const t0 = performance.now();

  // prevents two sit/stand animations from running at the same time
  if(seatTween) cancelAnimationFrame(seatTween);

  (function step() {
    const t = Math.min(1, (performance.now()-t0)/650);

    // quad ease in-out formula
    // first half accelerates, second half decelerates
    const e = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

    player.position.lerpVectors(from, to, e);
    camYaw = startYaw + (endYaw-startYaw)*e;
    playerBody.rotation.y = startFacing + facingDiff*e;
    applyBlendedPose(e, STAND_POSE, SEAT_POSE);

    if(t<1) seatTween = requestAnimationFrame(step);
    else seatTweenActive = false;
  })();
}

function standUp(){
  if(!seated || seatTweenActive) return;
  seatTweenActive = true;

  lastSatChairEntry = seated.entry;
  lastStandUpTime = performance.now();
  const from = player.position.clone();
  const to = seated.standPos.clone();

  // makes the stand up spot a bit further from the chair since standPos was recorded right at the collision boundary
  const chairPos = seated.entry.seatPos;
  const away = new THREE.Vector3(to.x - chairPos.x, 0, to.z - chairPos.z);
  if(away.lengthSq() > 1e-6){ away.normalize(); to.addScaledVector(away, 0.35); }

  const startFacing = playerBody.rotation.y;
  let facingDiff = seated.standFacing - startFacing;
  facingDiff = Math.atan2(Math.sin(facingDiff), Math.cos(facingDiff));
  const t0 = performance.now();
  if(seatTween) cancelAnimationFrame(seatTween);
  (function step(){
    const t = Math.min(1, (performance.now()-t0)/500);
    const e = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    player.position.lerpVectors(from, to, e);
    playerBody.rotation.y = startFacing + facingDiff*e;
    applyBlendedPose(e, SEAT_POSE, STAND_POSE);
    if(t<1) seatTween = requestAnimationFrame(step);
    else { seatTweenActive = false; seated = null; }
  })();
}

let teleportTween = null;

function teleportTo(key) {
  const anchor = shelfAnchors[key];

  if(!anchor) return;

  // player is seated
  if(seated || seatTweenActive) {
    // cancel the sitting animation and make the player instantly stand
    if(seatTween) cancelAnimationFrame(seatTween);
    seated = null; 
    seatTweenActive = false;
    applyBlendedPose(1, SEAT_POSE, STAND_POSE);

    // reset vertical position to ground level
    player.position.y = 0;
  }

  const from = player.position.clone();
  const to = new THREE.Vector3(anchor.x,0,anchor.z);
  const startYaw = camYaw, endYaw = anchor.yaw;
  const startFacing = playerBody.rotation.y;
  let facingDiff = anchor.facing - startFacing;
  facingDiff = Math.atan2(Math.sin(facingDiff), Math.cos(facingDiff)); // shortest turn direction
  const t0 = performance.now();
  if(teleportTween) cancelAnimationFrame(teleportTween);
  function step(){
    const t = Math.min(1, (performance.now()-t0)/700);
    const e = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    player.position.lerpVectors(from, to, e);
    camYaw = startYaw + (endYaw-startYaw)*e;
    playerBody.rotation.y = startFacing + facingDiff*e;
    if(t<1) teleportTween = requestAnimationFrame(step);
  }
  step();
}
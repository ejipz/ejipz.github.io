// this file runs continuously
// handles moving the player, animating the walk, checking for collisions and moving the camera

function updateMovement(dt){
  if(seatTweenActive) return; // mid sit/stand animation — hands off
  if(seated){
    const wantsToMove = keys['w']||keys['a']||keys['s']||keys['d']||
      keys['arrowup']||keys['arrowdown']||keys['arrowleft']||keys['arrowright'];
    if(wantsToMove) standUp();
    return; // no walking, and no walk-cycle animation, while seated
  }
  
  // ix is how much to move along the x-axis (left/right)
  // iz is how much to move along the z-axis (front/back)
  let ix = 0, iz = 0;

  // laptop input
  if(keys['w'] || keys['arrowup']) iz -= 1; // pressing w or the up arrow (forward) subtracts 1 from iz
  if(keys['s'] || keys['arrowdown']) iz += 1;
  if(keys['a'] || keys['arrowleft']) ix -= 1;
  if(keys['d'] || keys['arrowright']) ix += 1;

  // mobile input
  ix += moveVec.x; iz += moveVec.y;

  // calculate the actual real-world len of diagonals
  const len = Math.hypot(ix,iz);

  if (len > 0.001) {
    // dividing both values by the len ensures walking diagonally & walking straight feels exactly as fast
    ix/=len; iz/=len;

    // move the player relative to the direction they are facing
    const speed = 4.2;
    const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

    const dir = new THREE.Vector3()
      .addScaledVector(forward, -iz)
      .addScaledVector(right, ix);
    dir.normalize();

    // adds the movement vector to the player's current position to move the player
    // speed*dt keeps the speed consistent regardless of how fast/slow a computer is
    const desired = player.position.clone().addScaledVector(dir, speed*dt);
    
    function maybeAutoSit(hit){
      if(!hit || !hit.sitEntry) return;
      if(hit.sitEntry === lastSatChairEntry && performance.now() - lastStandUpTime < 900) return;
      const toChair = new THREE.Vector3(hit.center.x - player.position.x, 0, hit.center.z - player.position.z);
      if(toChair.lengthSq() < 1e-6) return;
      toChair.normalize();
      if(dir.dot(toChair) > 0.35) sitDown(hit.sitEntry);
    }

    const fullDesired = new THREE.Vector3(desired.x, 0, desired.z);
    const fullHit = getCollision(fullDesired);

    if(!fullHit) {
      // if the player does not bump into anything while taking the step
      player.position.x = clamp(desired.x, -ROOM_W/2+0.6, ROOM_W/2-0.6);
      player.position.z = clamp(desired.z, -ROOM_D/2+0.6, ROOM_D/2-0.6);
    } else {
      // if the player collides with an obj
      maybeAutoSit(fullHit);

      // tests what happens if the player only moves sideways/forward or backwards
      // whichever move is clear is allowed
      let testX = new THREE.Vector3(desired.x, 0, player.position.z);
      const hitX = getCollision(testX);
      if(!hitX) player.position.x = clamp(desired.x, -ROOM_W/2+0.6, ROOM_W/2-0.6); // prevents the player from walking through the walls
      else maybeAutoSit(hitX);

      let testZ = new THREE.Vector3(player.position.x, 0, desired.z);
      const hitZ = getCollision(testZ);
      if(!hitZ) player.position.z = clamp(desired.z, -ROOM_D/2+0.6, ROOM_D/2-0.6);
      else maybeAutoSit(hitZ);
    }

    // targetRot turns a dir into an angle
    const targetRot = Math.atan2(dir.x, dir.z);
    let diff = targetRot - playerBody.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // normalise any angle diff into the shortest possible turn
    playerBody.rotation.y += diff * Math.min(1, dt*8); // rotates a player only a bit each frame to make the turn smooth
  }

  animateCharacter(dt, len > 0.001);
}

function animateCharacter(dt, isMoving){
  if(!playerParts) return;

  // walkAmount is a num between 0 and 1
  // ease the player towards the value a little bit each frame
  walkAmount += ((isMoving ? 1 : 0) - walkAmount) * Math.min(1, dt*6);

  // torso rotation
  // keeps counting up forever while the website runs
  walkPhase += dt * 9;
  const amp = 0.55 * walkAmount;

  // passing an increasing num to Math.sin produces a smooth wave that goes up and down forever
  // amp controls how big the swing is
  playerParts.legL.rotation.x = Math.sin(walkPhase) * amp;
  playerParts.legR.rotation.x = -Math.sin(walkPhase) * amp;
  playerParts.armL.rotation.x = -Math.sin(walkPhase) * amp * 0.8;
  playerParts.armR.rotation.x = Math.sin(walkPhase) * amp * 0.8;
  playerParts.torso.position.y = 0.78 + Math.abs(Math.sin(walkPhase)) * 0.025 * walkAmount; // multiplying by walkAmount means the swing stops when the player stops walking
  playerParts.headGroup.position.y = 1.28 + Math.abs(Math.sin(walkPhase)) * 0.02 * walkAmount;

  // play a footstep sound each time a footstep lands
  const stepIndex = Math.floor(walkPhase / Math.PI);
  if(walkAmount > 0.6 && stepIndex !== lastFootstepIndex){
    lastFootstepIndex = stepIndex;
    playFootstep();
  }
}

function getCollision(pos) {
  for(const c of collidables) {
    if(c.type === 'box') {
      // checks if the player's position is within the obj's edges
      const dx = pos.x - c.cx, dz = pos.z - c.cz;

      // unrotate angled shelf to make the collision check easier
      const localX = dx*Math.cos(c.rotY) + dz*Math.sin(c.rotY);
      const localZ = -dx*Math.sin(c.rotY) + dz*Math.cos(c.rotY);

      if(Math.abs(localX) < c.halfW && Math.abs(localZ) < c.halfD) return c;
    } 
    // round objs
    else {
      // calculate the straight line distance between the player and the obj's centre
      // and check if the player is closer than the obj's radius
      const dx = pos.x - c.center.x, dz = pos.z - c.center.z;
      if(Math.hypot(dx,dz) < c.radius + 0.35) return c;
    }
  }

  return null;
}

function collides(pos) { return !!getCollision(pos); }

function updateCamera() {
  // calculates where the camera should sit relative to the player
  // camYaw spins left & right while camPitch tilts up and down
  const offX = camDist*Math.sin(camYaw)*Math.cos(camPitch);
  const offZ = camDist*Math.cos(camYaw)*Math.cos(camPitch);
  const offY = camDist*Math.sin(camPitch) + EYE_H;

  const margin = 0.5;
  const cx = clamp(player.position.x + offX, -ROOM_W/2 + margin, ROOM_W/2 - margin); // helps to keep the camera within the room
  const cz = clamp(player.position.z + offZ, -ROOM_D/2 + margin, ROOM_D/2 - margin);
  const cy = clamp(offY, 0.6, WALL_H - 0.4);

  camera.position.set(cx, cy, cz);

  // points the camera back at the player
  // so the camera can swing all around the player while keeping them the centre of attention
  camera.lookAt(player.position.x, EYE_H*0.75, player.position.z);
}

function animate() {
  requestAnimationFrame(animate);

  // how many seconds passed since the last frame
  // capped at 0.05s to help keep the animation smooth even if theres a big pause
  const dt = Math.min(clock.getDelta(), 0.05);

  updateMovement(dt);
  updateCamera();

  const motes = scene.getObjectByName('motes');
  if(motes){ motes.rotation.y += dt*0.01; }

  renderer.render(scene, camera);
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
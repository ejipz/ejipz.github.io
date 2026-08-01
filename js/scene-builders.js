// lights
function buildLights() {
  // ambient light
  hemiLight = new THREE.HemisphereLight(0xcfe8e0, 0x3a2f22, 0.55);
  scene.add(hemiLight);

  // sunlight
  sunLight = new THREE.DirectionalLight(0xfff2d6, 0.9);
  sunLight.position.set(-8, 12, 10);

  // shadows
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048,2048);
  sunLight.shadow.camera.left = -18; sunLight.shadow.camera.right = 18;
  sunLight.shadow.camera.top = 18; sunLight.shadow.camera.bottom = -18;
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 40;
  sunLight.shadow.bias = -0.0015;
  scene.add(sunLight);

  // room lights
  fillLight = new THREE.PointLight(0xffe3b0, 0.9, 20);
  fillLight.position.set(6,4,4);
  scene.add(fillLight);
}

// time of day lighting
const TOD_KEYFRAMES = [
  { h:0,    sky:['#0b1a2e','#16263d'], hemi:['#26364c','#0d1015'], hemiI:0.26, sun:'#8fa3c9', sunI:0.20, fog:'#0b1626' },
  { h:5,    sky:['#16263d','#2c3b52'], hemi:['#2c3b52','#10141c'], hemiI:0.30, sun:'#8fa3c9', sunI:0.23, fog:'#16263d' },
  { h:6.5,  sky:['#f2a56d','#ffd9a0'], hemi:['#ffd9a0','#3a2f22'], hemiI:0.42, sun:'#ffcf9e', sunI:0.55, fog:'#f0b98a' },
  { h:8,    sky:['#bfe3f0','#eaf6f5'], hemi:['#cfe8e0','#3a2f22'], hemiI:0.50, sun:'#fff2d6', sunI:0.80, fog:'#cfe4dd' },
  { h:12,   sky:['#bfe3f0','#eaf6f5'], hemi:['#cfe8e0','#3a2f22'], hemiI:0.55, sun:'#fff2d6', sunI:0.90, fog:'#cfe4dd' },
  { h:16,   sky:['#bfe3f0','#f0e2c8'], hemi:['#e6dcc0','#3a2f22'], hemiI:0.50, sun:'#ffe2ad', sunI:0.80, fog:'#e3d4b6' },
  { h:18.5, sky:['#4a3b6b','#ff9d5c'], hemi:['#ffb37e','#2a2035'], hemiI:0.40, sun:'#ff9d5c', sunI:0.55, fog:'#8a5a5c' },
  { h:20,   sky:['#1c2038','#3a2f4a'], hemi:['#3a2f4a','#151022'], hemiI:0.34, sun:'#9a7fae', sunI:0.36, fog:'#221c33' },
  { h:22,   sky:['#0f1c30','#182a44'], hemi:['#26364c','#0d1015'], hemiI:0.28, sun:'#8fa3c9', sunI:0.26, fog:'#0f1c30' },
  { h:24,   sky:['#0b1a2e','#16263d'], hemi:['#26364c','#0d1015'], hemiI:0.26, sun:'#8fa3c9', sunI:0.20, fog:'#0b1626' }
];

function applyTimeOfDay(){
  const params = new URLSearchParams(window.location.search);
  const overrideHour = parseFloat(params.get('hour'));

  const now = new Date();

  // calculates the current time as a single decimal number
  const hour = !isNaN(overrideHour) ? overrideHour : now.getHours() + now.getMinutes()/60;

  // find the two nearest keyframes
  let a = TOD_KEYFRAMES[0], b = TOD_KEYFRAMES[TOD_KEYFRAMES.length-1];
  for (let i=0;i<TOD_KEYFRAMES.length-1;i++) {
    if(hour >= TOD_KEYFRAMES[i].h && hour <= TOD_KEYFRAMES[i+1].h){
      a = TOD_KEYFRAMES[i]; b = TOD_KEYFRAMES[i+1]; break;
    }
  }

  // calculate far the current time is from a and b expressed as as a percentage from 0 to 1
  const t = (hour - a.h) / ((b.h - a.h) || 1);
  const lerpColor = (c1, c2) => new THREE.Color(c1).lerp(new THREE.Color(c2), t); // used to mix both a and b's colours

  const skyTop = lerpColor(a.sky[0], b.sky[0]);
  const skyBottom = lerpColor(a.sky[1], b.sky[1]);
  const hemiSky = lerpColor(a.hemi[0], b.hemi[0]);
  const hemiGround = lerpColor(a.hemi[1], b.hemi[1]);
  const sunColor = lerpColor(a.sun, b.sun);
  const fogColor = lerpColor(a.fog, b.fog);
  const hemiI = a.hemiI + (b.hemiI - a.hemiI)*t;
  const sunI = a.sunI + (b.sunI - a.sunI)*t;

  if(hemiLight){ hemiLight.color.copy(hemiSky); hemiLight.groundColor.copy(hemiGround); hemiLight.intensity = hemiI; }
  if(sunLight){ sunLight.color.copy(sunColor); sunLight.intensity = sunI; }
  if(scene.fog) scene.fog.color.copy(fogColor);

  if(pendantLights.length){
    const basePendantI = 0.9, baseEmissive = 1.1;
    const pendantScale = 1 + (0.55 - hemiI) * 8; // automatically brighten ceiling lights at night
    pendantLights.forEach(pl => { pl.intensity = basePendantI * pendantScale; });
    pendantBulbs.forEach(b => { b.material.emissiveIntensity = baseEmissive * pendantScale; });
  }

  if(windowViewMeshes.length){
    const isNight = hour < 6 || hour > 19;
    const dayProgress = Math.max(0, Math.min(1, (hour - 6) / 13));
    const nightProgress = Math.max(0, Math.min(1, (((hour + 24 - 19) % 24)) / 11));
    const sunX = 30 + (isNight ? nightProgress : dayProgress) * 196;

    const texNoSun = makeSkyTexture('#'+skyTop.getHexString(), '#'+skyBottom.getHexString(), '#'+sunColor.getHexString(), isNight, sunX, 0, false);
    const texWithSun = makeSkyTexture('#'+skyTop.getHexString(), '#'+skyBottom.getHexString(), '#'+sunColor.getHexString(), isNight, sunX, 0, true);

    windowViewMeshes.forEach(({ view, isPrimary }) => {
      view.material.map = isPrimary ? texWithSun : texNoSun;
      view.material.needsUpdate = true;
    });
  }
}

function buildRoom(){
  const floorTex = makeFloorTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness:0.85 })
  );

  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallTexWide = makeWallTexture(ROOM_W);
  const wallTexDeep = makeWallTexture(ROOM_D);

  // back wall
  backWall = new THREE.Mesh(
    // flat rect
    new THREE.PlaneGeometry(ROOM_W, WALL_H),
    new THREE.MeshStandardMaterial({ map:wallTexWide, roughness:0.95, transparent:true })
  );

  backWall.position.set(0, WALL_H/2, -ROOM_D/2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // front wall
  frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, WALL_H),
    new THREE.MeshStandardMaterial({ map:wallTexWide, roughness:0.95, transparent:true })
  );

  frontWall.position.set(0, WALL_H/2, ROOM_D/2);
  frontWall.rotation.y = Math.PI;
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // right wall
  rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_D, WALL_H),
    new THREE.MeshStandardMaterial({ map:wallTexDeep, roughness:0.95, transparent:true })
  );

  rightWall.position.set(ROOM_W/2, WALL_H/2, 0);
  rightWall.rotation.y = -Math.PI/2; // rotate 90 deg, -Math.PI/2 is 90 deg in radians
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // left wall
  leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_D, WALL_H),
    new THREE.MeshStandardMaterial({ map:wallTexDeep, roughness:0.95, transparent:true })
  );

  leftWall.position.set(-ROOM_W/2, WALL_H/2, 0);
  leftWall.rotation.y = Math.PI/2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const trimMat = new THREE.MeshStandardMaterial({ color:0x8A6A42, roughness:0.7 });
  const trimBack = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W,0.28,0.06), trimMat);
  trimBack.position.set(0,0.14,-ROOM_D/2+0.03);
  scene.add(trimBack);
  const trimFront = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W,0.28,0.06), trimMat);
  trimFront.position.set(0,0.14,ROOM_D/2-0.03);
  scene.add(trimFront);
  const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.28,ROOM_D), trimMat);
  trimRight.position.set(ROOM_W/2-0.03,0.14,0);
  scene.add(trimRight);
  const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.28,ROOM_D), trimMat);
  trimLeft.position.set(-ROOM_W/2+0.03,0.14,0);
  scene.add(trimLeft);

  const ceilingTex = makeWallTexture(ROOM_W, ROOM_D);
  ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map: ceilingTex, roughness:0.95, transparent:true })
  );
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.set(0, WALL_H, 0);
  ceiling.castShadow = false;
  scene.add(ceiling);
}

// window
function buildWindow(x, y, z, rotY, skyTexture){
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  const winW = 2.4, winH = 1.7;

  // flat rect with the sky texture
  const view = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    new THREE.MeshBasicMaterial({ map: skyTexture })
  );

  // placed 0.01 units in front of a wall
  view.position.z = 0.01;
  g.add(view);
  const isPrimary = windowViewMeshes.length === 0;
  windowViewMeshes.push({ view, isPrimary });

  const frameMat = new THREE.MeshStandardMaterial({ color:0x8A6A42, roughness:0.7 });
  const frameThick = 0.09;

  // window frames
  // z = 0.02 (slightly forward)
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(winW+frameThick*2, frameThick, 0.05), frameMat);
  topBar.position.set(0, winH/2 + frameThick/2, 0.02); topBar.castShadow = true;
  const bottomBar = topBar.clone(); bottomBar.position.y = -(winH/2 + frameThick/2);
  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH+frameThick*2, 0.05), frameMat);
  leftBar.position.set(-(winW/2 + frameThick/2), 0, 0.02); leftBar.castShadow = true;
  const rightBar = leftBar.clone(); rightBar.position.x = (winW/2 + frameThick/2);
  g.add(topBar, bottomBar, leftBar, rightBar);

  const mullionThick = 0.045;
  const vMullion = new THREE.Mesh(new THREE.BoxGeometry(mullionThick, winH, 0.04), frameMat);
  vMullion.position.z = 0.021;
  const hMullion = new THREE.Mesh(new THREE.BoxGeometry(winW, mullionThick, 0.04), frameMat);
  hMullion.position.z = 0.021;
  g.add(vMullion, hMullion);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW-0.04, winH-0.04),
    new THREE.MeshStandardMaterial({ color:0xBFE3F0, transparent:true, opacity:0.1, roughness:0.05, metalness:0.1 })
  );
  glass.position.z = 0.025;
  g.add(glass);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(winW+0.3, 0.06, 0.22), frameMat);
  sill.position.set(0, -(winH/2+frameThick), 0.11); sill.castShadow = true;
  g.add(sill);

  scene.add(g);
}

function buildDecor(){
  function plant(x,z,scale=1){
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28*scale,0.22*scale,0.34*scale,10), new THREE.MeshStandardMaterial({color:0xB0713F, roughness:0.9}));
    pot.position.y = 0.17*scale; pot.castShadow = true;
    g.add(pot);
    for(let i=0;i<7;i++){
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22*scale,6,6), new THREE.MeshStandardMaterial({color:0x4F7A4A, roughness:0.8}));
      const ang = (i/7)*Math.PI*2;
      leaf.position.set(Math.cos(ang)*0.18*scale, 0.5*scale + Math.random()*0.15*scale, Math.sin(ang)*0.18*scale);
      leaf.scale.set(1,1.5,0.6);
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x,0,z);
    scene.add(g);
    addCollider(g, 0.35*scale);
  }

  const chairMat = new THREE.MeshStandardMaterial({ color:0xD9A441, roughness:0.85 });
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.35,1.0), chairMat); seat.position.y = 0.35; seat.castShadow = true;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.9,0.25), chairMat); back.position.set(0,0.75,-0.4); back.castShadow = true;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.5,1.0), chairMat); armL.position.set(-0.55,0.55,0); armL.castShadow = true;
  const armR = armL.clone(); armR.position.x = 0.55;
  chair.add(seat, back, armL, armR);

  // Math.atan2 converts a direction into an angle
  chair.position.set(7.6, 0, 5.4);
  const chairFacing = Math.atan2(-6 - 7.6, -4.5 - 5.4);
  chair.rotation.y = chairFacing;
  scene.add(chair);

  // make the armchair interactable
  const armchairEntry = {
    meshes: [seat, back, armL, armR],
    seatPos: chair.position.clone(),
    rideHeight: 0.525 - 0.55,
    seatFacing: chairFacing,
    label: 'the armchair'
  };

  sittables.push(armchairEntry);

  addCollider(chair, 0.75, null, armchairEntry);

  // place the plant on the right of the armchair
  const chairRightDir = new THREE.Vector3(Math.cos(chair.rotation.y), 0, -Math.sin(chair.rotation.y));
  const plantGap = 1.15;
  const plantPos = chair.position.clone().addScaledVector(chairRightDir, -plantGap);
  plant(plantPos.x, plantPos.z, 0.9);

  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.06,16), new THREE.MeshStandardMaterial({color:0x8A6A42,roughness:0.7}));
  top.position.y = 0.62; top.castShadow = true;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.6,8), new THREE.MeshStandardMaterial({color:0x5E4529}));
  leg.position.y = 0.3;
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.1,10), new THREE.MeshStandardMaterial({color:0xB08D57,metalness:0.4,roughness:0.4}));
  lampBase.position.y = 0.7;
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.16,0.2,10,1,true), new THREE.MeshStandardMaterial({color:0xF2B77E, side:THREE.DoubleSide, emissive:0xFFCB8E, emissiveIntensity:0.05}));
  lampShade.position.y = 0.86;

  // lamp
  const lampLight = new THREE.PointLight(0xFFA94D, 0, 4.5, 2); // intensity starts at 0 (off by default)
  lampLight.position.set(0, 0.86, 0);
  table.add(top, leg, lampBase, lampShade, lampLight);
  table.position.set(6.6, 0, 6.6);
  scene.add(table);
  addCollider(table, 0.45);

  let lampOn = false;

  function toggleLamp(){
    lampOn = !lampOn;
    lampShade.material.emissiveIntensity = lampOn ? 0.55 : 0.05;
    lampLight.intensity = lampOn ? 0.9 : 0;
    playClick(lampOn);
  }

  interactables.push({ mesh: lampBase, onClick: toggleLamp, hoverText: 'Turn the lamp on/off' });
  interactables.push({ mesh: lampShade, onClick: toggleLamp, hoverText: 'Turn the lamp on/off' });

  // study desk
  (function buildStudyDesk(x, z, rotY){
    const g = new THREE.Group();
    const deskMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture('#C9A876','#8A6A42'), roughness:0.75 });
    const legMat = new THREE.MeshStandardMaterial({ color:0x5E4529, roughness:0.7 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.7), deskMat);
    top.position.y = 0.72; top.castShadow = true; top.receiveShadow = true;
    g.add(top);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8);
    [[-0.68,-0.28],[0.68,-0.28],[-0.68,0.28],[0.68,0.28]].forEach(([lx,lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.36, lz);
      leg.castShadow = true;
      g.add(leg);
    });

    const bookColors = [0x8B5E4A, 0x4C7C79, 0xB0713F];
    let by = 0.75;
    bookColors.forEach((c, i) => {
      const bh = 0.05;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, bh, 0.2), new THREE.MeshStandardMaterial({ color:c, roughness:0.6 }));
      book.position.set(-0.45, by + bh/2, -0.1);
      book.rotation.y = (i-1)*0.15;
      book.castShadow = true;
      g.add(book);
      by += bh;
    });

    // laptop
    const laptopMat = new THREE.MeshStandardMaterial({ color:0x3B4A5A, roughness:0.4, metalness:0.3 });
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.22), laptopMat);
    laptopBase.position.set(0.15, 0.735, 0.05);
    laptopBase.castShadow = true;
    g.add(laptopBase);

    const hingeY = 0.735 + 0.01, hingeZ = 0.05 - 0.11;
    const screenHinge = new THREE.Group();
    screenHinge.position.set(0.15, hingeY, hingeZ);
    screenHinge.rotation.x = -0.35;
    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.015), laptopMat);
    laptopScreen.position.set(0, 0.1, 0); 
    laptopScreen.castShadow = true;
    screenHinge.add(laptopScreen);
    g.add(screenHinge);

    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.015, 0.16),
      laptopMat
    );
    keyboard.position.set(0.15, 0.735 + 0.017, 0.02);
    keyboard.castShadow = true;
    g.add(keyboard);

    const officeMat = new THREE.MeshStandardMaterial({ color:0x2E4A52, roughness:0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color:0x2A2A2A, roughness:0.5, metalness:0.5 });
    const officeChair = new THREE.Group();
    const oSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.08, 12), officeMat);
    oSeat.position.y = 0.46; oSeat.castShadow = true;
    const oBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.06), officeMat);
    oBack.position.set(0, 0.72, -0.2); oBack.castShadow = true;
    const oPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), metalMat);
    oPost.position.y = 0.22;
    const oBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), metalMat);
    oBase.position.y = 0.02;
    officeChair.add(oSeat, oBack, oPost, oBase);
    officeChair.position.set(0, 0, 0.55);
    officeChair.rotation.y = Math.PI; 

    const officeSeatMarker = new THREE.Object3D();
    officeSeatMarker.position.set(0, 0.5, 0);
    officeChair.add(officeSeatMarker);
    g.add(officeChair);

    const scale = 1.4; 
    g.scale.set(scale, scale, scale);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
    addBoxCollider(x, z, 0.9*scale, 0.5*scale, rotY);

    g.updateMatrixWorld(true);
    const officeSeatPos = officeSeatMarker.getWorldPosition(new THREE.Vector3());
    const deskChairEntry = {
      meshes: [oSeat, oBack, oPost, oBase],
      seatPos: officeSeatPos,
      rideHeight: officeSeatPos.y - 0.55,
      seatFacing: Math.PI/2,
      label: 'the desk chair'
    };
    sittables.push(deskChairEntry);

    collidables.push({
      type:'circle',
      center: { x: officeSeatPos.x, z: officeSeatPos.z },
      radius: 0.45,
      sitEntry: deskChairEntry
    });

  })(-7.7, 0, -Math.PI/2);

  for(const px of [-4,4]){
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,2.6,4), new THREE.MeshStandardMaterial({color:0x333333}));
    cord.position.set(px, 6.7, -2);
    scene.add(cord);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16,10,10), new THREE.MeshStandardMaterial({color:0xFFEFC2, emissive:0xFFE9B0, emissiveIntensity:0.6}));
    bulb.position.set(px, 5.4, -2);
    scene.add(bulb);
    const pl = new THREE.PointLight(0xffe3b0, 0.5, 11, 1.6);
    pl.position.copy(bulb.position);
    scene.add(pl);
    pendantLights.push(pl);
    pendantBulbs.push(bulb);
  }

  function makeDotTexture() {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(16,16,0, 16,16,16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,32,32);
    return new THREE.CanvasTexture(c);
  }

  const moteGeo = new THREE.BufferGeometry();
  const count = 120;
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    positions[i*3] = (Math.random()-0.5)*ROOM_W;
    positions[i*3+1] = Math.random()*WALL_H*0.7 + 0.4;
    positions[i*3+2] = (Math.random()-0.5)*ROOM_D;
  }

  moteGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const moteMat = new THREE.PointsMaterial({
    color:0xFFF3D0, size:0.09, map: makeDotTexture(),
    transparent:true, opacity:0.6, depthWrite:false
  });
  
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.name = 'motes';
  scene.add(motes);
}

// round collision zone for round objs like a plant
function addCollider(object3D, radius, radiusZ, sitEntry){
  object3D.updateWorldMatrix(true,true);
  const box = new THREE.Box3().setFromObject(object3D);
  collidables.push({ type:'circle', center: box.getCenter(new THREE.Vector3()), radius: radius || 0.6, sitEntry: sitEntry || null });
}

// rectangular collision zone
function addBoxCollider(x, z, halfW, halfD, rotY){
  collidables.push({ type:'box', cx:x, cz:z, halfW: halfW + 0.35, halfD: halfD + 0.35, rotY: rotY || 0 });
}

function buildCatalogKiosk(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const scale = 1.4;
  g.scale.set(scale, scale, scale);

  const cabinetMat = new THREE.MeshStandardMaterial({ color:0xEDE6D6, roughness:0.6 });
  const counterMat = new THREE.MeshStandardMaterial({ color:0xC9A876, roughness:0.55 });

  // cabinet (0.95 units tall box)
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.55), cabinetMat);
  cabinet.position.y = 0.475; cabinet.castShadow = true; cabinet.receiveShadow = true;
  g.add(cabinet);

  // counter
  // 0.95 units wide so it slightly pops out over the cabinet
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.62), counterMat);
  counter.position.y = 0.975; counter.castShadow = true;
  g.add(counter);

  // desktop monitor
  // stand
  const desktopMat = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.45 });
  const desktopStand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.1), desktopMat);
  desktopStand.position.set(0, 1.065, -0.16);
  desktopStand.castShadow = true;
  g.add(desktopStand);

  // screen
  const desktopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.03), desktopMat);
  desktopScreen.position.set(0, 1.29, -0.16);
  desktopScreen.castShadow = true;
  g.add(desktopScreen);

  const desktopGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.2),
    new THREE.MeshStandardMaterial({ color:0xE0E3E4, emissive:0xE0E3E4, emissiveIntensity:0.16 })
  );
  desktopGlow.position.set(0, 1.29, -0.144);
  g.add(desktopGlow);

  // keyboard
  // bigger black rect
  const keyboardSurround = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.16), desktopMat);
  keyboardSurround.position.set(0, 0.998, 0.08);
  keyboardSurround.castShadow = true;
  g.add(keyboardSurround);

  // smaller white rect
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.02, 0.12), new THREE.MeshStandardMaterial({ color:0xFFFFFF, roughness:0.7 }));
  keyboard.position.set(0, 1.006, 0.08);
  keyboard.castShadow = true;
  g.add(keyboard);

  scene.add(g);
  addCollider(g, 0.5 * scale);

  // signboard
  const sign = makeLabelSprite('CATALOGUE', 'var(--brass)');
  sign.scale.set(1.7, 0.425, 1);
  sign.position.set(0, 1.75, -0.16);
  g.add(sign);

  // make the desktop monitor interactable
  interactables.push({ mesh: desktopStand, onClick: openCatalog, hoverText: 'Browse the catalogue' });
  interactables.push({ mesh: desktopScreen, onClick: openCatalog, hoverText: 'Browse the catalogue' });
}

function buildBookshelf({ key, label, x, z, rotY, data }){
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const shelfW = 5.2, shelfH = 6.0, shelfD = 0.9;
  const frameMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture('#C9A876','#8A6A42'), roughness:0.75 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(shelfW, shelfH, 0.08), frameMat);
  back.position.set(0, shelfH/2, -shelfD/2+0.04);
  back.castShadow = true; back.receiveShadow = true;
  group.add(back);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, shelfH, shelfD), frameMat);
  sideL.position.set(-shelfW/2, shelfH/2, 0); sideL.castShadow = true;
  const sideR = sideL.clone(); sideR.position.x = shelfW/2;
  group.add(sideL, sideR);

  const top = new THREE.Mesh(new THREE.BoxGeometry(shelfW+0.2, 0.14, shelfD+0.15), frameMat);
  top.position.set(0, shelfH+0.07, 0); top.castShadow = true;
  group.add(top);

  const levels = 4;
  const usableH = shelfH - 0.3;
  for(let i=0;i<=levels;i++){
    const y = 0.15 + (usableH/levels)*i;
    const board = new THREE.Mesh(new THREE.BoxGeometry(shelfW-0.2, 0.08, shelfD-0.1), frameMat);
    board.position.set(0, y, 0);
    board.castShadow = true; board.receiveShadow = true;
    group.add(board);
  }

  const shelfLevels = [];
  for(let i=0;i<levels;i++) shelfLevels.push(0.15 + (usableH/levels)*i);

  // calculates how many books can fit on one shelf level
  const bw = 0.36, bookGap = 0.09;
  const shelfMargin = 0.5; 
  const maxPerShelf = Math.max(1, Math.floor((shelfW - shelfMargin + bookGap) / (bw + bookGap)));
  const leftEdgeX = -(shelfW/2) + (shelfMargin/2) + bw/2;

  // figures out which shelf each book belongs to
  data.books.forEach((book, i) => {
    const levelIdx = Math.min(Math.floor(i/maxPerShelf), shelfLevels.length-1);
    const idxInLevel = i - levelIdx*maxPerShelf;

    // book height
    const bh = 0.9 + (i%3)*0.12, bd = shelfD-0.28; // i%3 is what gives the books diff heights
    const bx = leftEdgeX + idxInLevel*(bw+bookGap);
    const by = shelfLevels[shelfLevels.length - 1 - levelIdx] + bh/2 + 0.08; // counts shelf levels bottom up so the first book ends up on the top shelf

    const useAwardColors = book.type === 'award' && data.awardColors;
    const palette = useAwardColors ? data.awardColors : data.colors;
    const color = palette[i % palette.length];
    const bookMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      new THREE.MeshStandardMaterial({ color, roughness:0.6 })
    );

    bookMesh.position.set(bx, by, 0.02);
    bookMesh.castShadow = true; bookMesh.receiveShadow = true;

    // baseX is what controls.js uses for the hover animation
    bookMesh.userData = { sectionKey:key, index:i, baseColor:color, baseX:bx };
    group.add(bookMesh);
    interactables.push({ mesh: bookMesh, sectionKey:key, index:i });
  });

  const labelSprite = makeLabelSprite(label, data.accentCss);
  labelSprite.position.set(0, shelfH+0.75, 0.3);
  group.add(labelSprite);

  scene.add(group);
  addBoxCollider(x, z, shelfW/2, shelfD/2, rotY);
}
// build the 3D character
function buildPlayer(){
  player = new THREE.Group();
  playerBody = new THREE.Group();

  const skinMat  = new THREE.MeshStandardMaterial({ color:0xE8B98A, roughness:0.7 });
  const hairMat  = new THREE.MeshStandardMaterial({ color:0x3B2A22, roughness:0.55 });
  const sweaterMat = new THREE.MeshStandardMaterial({ color:0x7D7F7C, roughness:0.75 }); // hoodie
  const pantsMat = new THREE.MeshStandardMaterial({ color:0x2E2A24, roughness:0.8 }); // wide leg trousers
  const shoeMat  = new THREE.MeshStandardMaterial({ color:0xF2F2EE, roughness:0.5 }); // white sneakers

  // a cylinder shape
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23,0.27,0.62,12), sweaterMat);
  torso.position.y = 0.78;
  torso.castShadow = true;

  // a ball (used for the head, hair, eyes and cheeks)
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 14),
    sweaterMat
  );

  // sets the position across the x, y and z axis
  // x: left (-), right (+)
  // y: down (-), up (+)
  // z: back (-), front (+)
  hood.position.set(0, 1.0, -0.1);
  hood.scale.set(1.05, 0.95, 0.8);
  hood.castShadow = true;

  const stringMat = new THREE.MeshStandardMaterial({ color:0xE8E6E0, roughness:0.6 });
  function makeHoodString(xOff){
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.2,6), stringMat);
    s.position.set(xOff, 0.97, 0.26);
    s.rotation.z = xOff > 0 ? -0.05 : 0.05;
    s.castShadow = true;
    return s;
  }
  const stringL = makeHoodString(-0.05);
  const stringR = makeHoodString(0.05);

  // a group is an invisible container that holds multiple pieces as one unit
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.28;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.09,0.1,8), skinMat);
  neck.position.y = -0.18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21,16,16), skinMat);
  head.castShadow = true;
  headGroup.add(neck, head);

  const eyeMat = new THREE.MeshStandardMaterial({ color:0x2A2420, roughness:0.35 });
  const browMat = new THREE.MeshStandardMaterial({ color:0x3B2A22, roughness:0.6 });
  const mouthMat = new THREE.MeshStandardMaterial({ color:0x8A4A42, roughness:0.6 });
  const cheekMat = new THREE.MeshStandardMaterial({ color:0xE8917A, roughness:0.8, transparent:true, opacity:0.45 });

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026,8,8), eyeMat);
  eyeL.position.set(-0.078, 0.02, 0.192);

  // clone the right eye's values and flip the X position
  const eyeR = eyeL.clone(); eyeR.position.x = 0.078;

  // rectangle (used for eyebrows and shoes)
  const browL = new THREE.Mesh(new THREE.BoxGeometry(0.075,0.016,0.012), browMat);
  browL.position.set(-0.078, 0.075, 0.19);
  browL.rotation.z = 0.12;
  const browR = browL.clone(); browR.position.x = 0.078; browR.rotation.z = -0.12;

  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.032,10,6), mouthMat);
  mouth.scale.set(1.6,0.55,0.5);
  mouth.position.set(0, -0.09, 0.195);

  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8), cheekMat);
  cheekL.scale.set(1,0.7,0.5);
  cheekL.position.set(-0.13, -0.03, 0.14);
  const cheekR = cheekL.clone(); cheekR.position.x = 0.13;

  headGroup.add(eyeL, eyeR, browL, browR, mouth, cheekL, cheekR);

  // position: x, y, z, s: size, sy: how verticially squashed it is, rz: tilt
  const hairTuftSpots = [
    { x:0,     y:0.175, z:-0.01, s:1.15, sy:0.8,  rz:0.1  },
    { x:0.07,  y:0.15,  z:-0.05, s:0.85, sy:0.75, rz:-0.15},
    { x:-0.075,y:0.155, z:-0.02, s:0.9,  sy:0.78, rz:0.2  },
    { x:0.04,  y:0.185, z:0.07,  s:0.65, sy:0.8,  rz:-0.1 },
    { x:-0.045,y:0.18,  z:0.08,  s:0.68, sy:0.8,  rz:0.15 },
    { x:0,     y:0.125, z:-0.13, s:0.8,  sy:0.75, rz:0    },
    { x:0.075, y:0.09,  z:-0.11, s:0.6,  sy:0.75, rz:-0.2 },
    { x:-0.075,y:0.09,  z:-0.11, s:0.6,  sy:0.75, rz:0.2  },
    { x:0.03,  y:0.14,  z:-0.09, s:0.55, sy:0.75, rz:0.05 },
    { x:-0.035,y:0.145, z:-0.1,  s:0.55, sy:0.75, rz:-0.05}
  ];

  // for each hair tuft, create a ball, position, squash and tilt it
  hairTuftSpots.forEach(p => {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.11*p.s, 10, 8), hairMat);
    tuft.position.set(p.x,p.y,p.z);
    tuft.scale.set(1, p.sy, 1);
    tuft.rotation.z = p.rz;
    tuft.castShadow = true;
    headGroup.add(tuft);
  });

  const fringe = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI*2, 0, Math.PI*0.42),
    hairMat
  );

  fringe.position.set(0, 0.05, 0.05);
  fringe.rotation.x = -0.55;
  fringe.scale.set(1, 0.6, 0.85);
  fringe.castShadow = true;
  headGroup.add(fringe);

  // build a limb
  function makeLimb(mat, len, radTop, radBottom){
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radTop, radBottom, len, 8), mat);
    mesh.position.y = -len/2;
    mesh.castShadow = true;
    pivot.add(mesh);
    pivot.userData.len = len;
    return pivot;
  }

  const armL = makeLimb(sweaterMat, 0.5, 0.075, 0.065); armL.position.set(-0.29, 1.05, 0);
  const armR = makeLimb(sweaterMat, 0.5, 0.075, 0.065); armR.position.set(0.29, 1.05, 0);

  const legL = makeLimb(pantsMat, 0.58, 0.135, 0.15); legL.position.set(-0.13, 0.6, 0);
  const legR = makeLimb(pantsMat, 0.58, 0.135, 0.15); legR.position.set(0.13, 0.6, 0);

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.09,0.24), shoeMat);
  shoeL.position.set(0, -legL.userData.len, 0.04); shoeL.castShadow = true;
  legL.add(shoeL);
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.09,0.24), shoeMat);
  shoeR.position.set(0, -legR.userData.len, 0.04); shoeR.castShadow = true;
  legR.add(shoeR);

  // assemble all body parts
  playerBody.add(torso, hood, stringL, stringR, headGroup, armL, armR, legL, legR);
  player.add(playerBody);
  player.position.set(0,0,1.0); // spawn player in the room
  scene.add(player);

  // bundle all the body parts into an obj so it can be used in other files
  playerParts = { torso, headGroup, armL, armR, legL, legR };
}
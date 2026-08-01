// procedural
function makeWoodTexture(base, dark){
  // create a 256x256 canvas
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d'); // used to draw on the canvas

  // fill the canvas with a base colour
  ctx.fillStyle = base; 
  ctx.fillRect(0,0,256,256);

  // draw 26 lines on the canvas
  for (let i=0;i<26;i++) {
    // pick a random transparency
    ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random()*0.05})`;

    ctx.lineWidth = 1 + Math.random()*2;
    ctx.beginPath();

    // pick a random vertical starting height for the line
    const y = Math.random()*256;

    ctx.moveTo(0, y);

    // draw a smooth curve
    ctx.bezierCurveTo(80, y+Math.random()*10-5, 170, y+Math.random()*10-5, 256, y+Math.random()*6-3);
    ctx.stroke();
  }

  // draw 10 ellipses
  for (let i=0;i<10;i++) {
    ctx.fillStyle = `rgba(0,0,0,0.06)`;
    ctx.beginPath();
    ctx.ellipse(Math.random()*256, Math.random()*256, 10+Math.random()*14, 4+Math.random()*6, Math.random()*Math.PI, 0, Math.PI*2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeFloorTexture(){
  const c = document.createElement('canvas'); c.width=512; c.height=512;
  const ctx = c.getContext('2d');
  
  const plankW = 64;

  // draws a vertical plank every 64 pixels
  for(let x=0; x<512; x+=plankW) {
    // randomly picked shade
    const shade = 205 + Math.floor(Math.random()*30);

    ctx.fillStyle = `rgb(${shade},${shade-30},${shade-70})`;
    ctx.fillRect(x,0,plankW-2,512);

    // dark line at the right edge of each plank
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x+plankW-2,0,2,512);

    for(let i=0;i<6;i++){
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      const y = Math.random()*512;
      ctx.moveTo(x+4,y); ctx.lineTo(x+plankW-6,y+Math.random()*8-4);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(ROOM_W/4, ROOM_D/4);
  return tex;
}

// diamond wallpaper pattern
function makeWallTexture(lengthUnits, heightUnits){
  const c = document.createElement('canvas'); c.width=256; c.height=256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#215951'; ctx.fillRect(0,0,256,256);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 6;

  const s = 64;
  for (let y=-64; y<320; y+=s) { // row
    for (let x=-64; x<320; x+=s) { // col
      // draw a diamond shape 
      ctx.beginPath();
      ctx.moveTo(x, y+s/2); ctx.lineTo(x+s/2,y); ctx.lineTo(x+s,y+s/2); ctx.lineTo(x+s/2,y+s); ctx.closePath();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set((lengthUnits||ROOM_W)/4, (heightUnits||WALL_H)/4);
  return tex;
}

// signboards
function makeLabelSprite(text, accentCss){
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');

  // draw a rounded dark rect
  ctx.fillStyle = 'rgba(46,42,36,0.82)';
  roundRect(ctx, 8, 28, 496, 72, 16); ctx.fill();

  // write text on top of the rounded rect
  ctx.font = '600 40px Fraunces, serif';
  ctx.fillStyle = '#F8F5EE';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true, depthTest:false });
  const sprite = new THREE.Sprite(mat); // sprites are used as they automatically face the camera
  sprite.scale.set(3.2, 0.8, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// window view
function makeSkyTexture(topColor, bottomColor, sunMoonColor, isNight, sunX=178, seed=0, showSun=true){
  const c = document.createElement('canvas'); c.width = 256; c.height = 180;
  const ctx = c.getContext('2d');

  // deterministic random num generator
  let s = (seed || 1) * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  // create a gradient that runs from the top to the bottom
  const grad = ctx.createLinearGradient(0,0,0,180);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);

  ctx.fillStyle = grad;
  ctx.fillRect(0,0,256,180);

  // sun
  if(showSun){
    ctx.fillStyle = sunMoonColor;
    ctx.beginPath();
    ctx.arc(sunX, 44, isNight ? 13 : 22, 0, Math.PI*2); // draw a full circle of radius 13 (night) or 22 (day)
    ctx.fill();
  }

  // night
  if(isNight){
    // generate 24 tiny random dots to simulate stars in the night sky
    ctx.fillStyle = 'rgba(255,255,255,0.85)';

    for (let i=0;i<24;i++) {
      ctx.fillRect(rand()*256, rand()*110, 1.4, 1.4);
    }
  } 
  // day
  else {
    // draw 3 ellipses to simulate clouds
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for(let i=0;i<3;i++){
      const cx = 34 + i*72 + rand()*18, cy = 26 + rand()*18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 24, 9, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  ctx.fillStyle = isNight ? 'rgba(6,12,20,0.9)' : 'rgba(60,90,60,0.55)';

  // mountains
  ctx.beginPath();
  ctx.moveTo(0,180); ctx.lineTo(0,140);
  for (let x=0;x<=256;x+=16) {
    const y = 128 + Math.sin(x*0.03)*10 + Math.sin(x*0.09)*5;
    ctx.lineTo(x,y);
  }

  ctx.lineTo(256,180);
  ctx.closePath();
  ctx.fill();

  return new THREE.CanvasTexture(c);
}
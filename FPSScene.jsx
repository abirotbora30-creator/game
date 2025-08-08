import React, { useEffect, useRef } from 'react'
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

export default function FPSScene({ onShowControls }){
  const mountRef = useRef(null);

  useEffect(()=>{
    let width = mountRef.current.clientWidth;
    let height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x072a22, 0.0007);

    const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 2000);
    camera.position.set(0, 1.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffcc, 0x080820, 0.8);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff1d6, 0.6);
    dir.position.set(-10,20,10);
    scene.add(dir);

    // ground (riverbank / jungle floor)
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ color:0x143d2b });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    scene.add(ground);

    // simple vegetation (cylinders + cones)
    for(let i=0;i<120;i++){
      const x = (Math.random()-0.5)*800;
      const z = (Math.random()-0.5)*800;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.8,6,6), new THREE.MeshStandardMaterial({color:0x4b2e1a}));
      trunk.position.set(x,3,z);
      scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.5,8,6), new THREE.MeshStandardMaterial({color:0x0b6b3a}));
      leaves.position.set(x,7,z);
      scene.add(leaves);
    }

    // player controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    let move = { forward:false, backward:false, left:false, right:false };
    let velocity = new THREE.Vector3();
    let direction = new THREE.Vector3();
    let canJump = false;
    let prevTime = performance.now();

    function onKeyDown(event){
      switch(event.code){
        case 'ArrowUp':
        case 'KeyW': move.forward = true; break;
        case 'ArrowLeft':
        case 'KeyA': move.left = true; break;
        case 'ArrowDown':
        case 'KeyS': move.backward = true; break;
        case 'ArrowRight':
        case 'KeyD': move.right = true; break;
        case 'Space':
          if ( canJump === true ) velocity.y += 5;
          canJump = false;
          break;
      }
    }
    function onKeyUp(event){
      switch(event.code){
        case 'ArrowUp':
        case 'KeyW': move.forward = false; break;
        case 'ArrowLeft':
        case 'KeyA': move.left = false; break;
        case 'ArrowDown':
        case 'KeyS': move.backward = false; break;
        case 'ArrowRight':
        case 'KeyD': move.right = false; break;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // pointer lock handlers
    const blocker = document.createElement('div');
    blocker.style.position='absolute'; blocker.style.top='0'; blocker.style.left='0'; blocker.style.width='100%'; blocker.style.height='100%';
    blocker.style.display='flex'; blocker.style.alignItems='center'; blocker.style.justifyContent='center';
    blocker.style.pointerEvents='none';
    mountRef.current.appendChild(blocker);

    const onLock = ()=> { onShowControls(false); blocker.style.display='none'; }
    const onUnlock = ()=> { onShowControls(true); blocker.style.display='flex'; blocker.style.pointerEvents='auto'; blocker.innerHTML='<div class="bg-black/60 p-4 rounded text-center">Click to play (pointer lock). Press Esc to unlock.</div>'; };

    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);
    blocker.addEventListener('click', ()=> controls.lock());
    onUnlock();

    scene.add(controls.getObject());

    // basic crosshair
    const cross = document.createElement('div');
    cross.style.position='absolute'; cross.style.top='50%'; cross.style.left='50%'; cross.style.width='10px'; cross.style.height='10px'; cross.style.margin='-5px 0 0 -5px';
    cross.style.border='2px solid rgba(255,255,255,0.8)'; cross.style.borderRadius='50%'; cross.style.pointerEvents='none';
    mountRef.current.appendChild(cross);

    // enemies (boxes) spawn
    const enemies = [];
    function spawnEnemy(pos){
      const geo = new THREE.BoxGeometry(1.2,2,1.2);
      const mat = new THREE.MeshStandardMaterial({color:0x8b1a1a});
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      m.userData = { hp:30 };
      scene.add(m);
      enemies.push(m);
    }
    for(let i=0;i<8;i++){
      spawnEnemy(new THREE.Vector3((Math.random()-0.5)*600,1,(Math.random()-0.5)*600));
    }

    // shooting raycaster
    const raycaster = new THREE.Raycaster();
    let ammo = 12;
    let hp = 100;

    function onMouseDown(e){
      if (!controls.isLocked) return;
      if (ammo<=0) return;
      ammo--;
      // sound placeholder: small oscillator
      try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type='square'; o.frequency.value=900; g.gain.value=0.02;
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.06);
      }catch(err){}
      raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
      const intersects = raycaster.intersectObjects(enemies);
      if (intersects.length>0){
        const hit = intersects[0].object;
        hit.userData.hp -= 20;
        if (hit.userData.hp<=0){
          scene.remove(hit);
          const idx = enemies.indexOf(hit); if (idx!==-1) enemies.splice(idx,1);
        }
      }
    }
    document.addEventListener('mousedown', onMouseDown);

    // simple enemy AI: move toward player when within distance
    function updateEnemies(delta){
      const playerPos = controls.getObject().position;
      enemies.forEach(en=>{
        const dir = new THREE.Vector3().subVectors(playerPos, en.position);
        const dist = dir.length();
        if (dist < 120){
          dir.normalize();
          en.position.addScaledVector(dir, 1.0 * delta);
          // if very close, damage player
          if (dist < 2.2){
            hp -= 10 * delta;
            if (hp<=0){ alert('You died — reload to try again'); controls.unlock(); }
          }
        } else {
          // patrol slight drift
          en.position.x += Math.sin(performance.now()*0.0003 + en.id||0)*0.001;
        }
      });
    }

    // HUD overlay
    const hud = document.createElement('div');
    hud.style.position='absolute'; hud.style.right='18px'; hud.style.top='18px'; hud.style.background='rgba(0,0,0,0.4)'; hud.style.padding='8px 10px'; hud.style.borderRadius='8px'; hud.style.fontFamily='Inter,Arial'; hud.style.fontSize='14px';
    hud.style.color='#e6f0f0';
    mountRef.current.appendChild(hud);

    function updateHUD(){
      hud.innerHTML = `<div>HP: ${Math.max(0,Math.round(hp))}</div><div>Ammo: ${ammo}</div><div style="margin-top:6px;font-size:12px;opacity:0.9">Enemies: ${enemies.length}</div>`;
    }

    // resize handling
    function onWindowResize(){
      width = mountRef.current.clientWidth; height = mountRef.current.clientHeight;
      camera.aspect = width/height; camera.updateProjectionMatrix();
      renderer.setSize(width,height);
    }
    window.addEventListener('resize', onWindowResize);

    // animation loop
    function animate(){
      requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTime)/1000;
      // movement
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;
      velocity.y += -9.8 * 5.0 * delta; // gravity
      direction.z = Number(move.forward) - Number(move.backward);
      direction.x = Number(move.right) - Number(move.left);
      direction.normalize();
      if (move.forward || move.backward) velocity.z -= direction.z * 400.0 * delta;
      if (move.left || move.right) velocity.x -= direction.x * 400.0 * delta;
      controls.moveRight(- velocity.x * delta);
      controls.moveForward(- velocity.z * delta);
      controls.getObject().position.y += (velocity.y * delta);
      if (controls.getObject().position.y < 1.6){ velocity.y = 0; controls.getObject().position.y = 1.6; canJump = true; }
      updateEnemies(delta);
      updateHUD();
      prevTime = time;
      renderer.render(scene, camera);
    }
    animate();

    // cleanup
    return ()=>{
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
      mountRef.current.removeChild(renderer.domElement);
      mountRef.current.removeChild(blocker);
      mountRef.current.removeChild(cross);
      mountRef.current.removeChild(hud);
      window.removeEventListener('resize', onWindowResize);
    }

  }, [onShowControls]);

  return <div ref={mountRef} className="w-full h-full relative"></div>
}

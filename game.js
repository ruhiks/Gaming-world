"use strict";

document.addEventListener("DOMContentLoaded", () => {

/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const GRAVITY = 0.8;
const SPEED = 5;
const JUMP = 15;
const FAST_FALL = 2;
const FALL_DEATH_Y = canvas.height + 60;
const CLOUD_SPEED = 0.3;

/* ================= LOADERS ================= */
const load = s => { const i = new Image(); i.src = s; return i; };

const bg = load("assets/bg.png");
const wizard = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg = load("assets/castle.png");
const dragonImg = load("assets/dragon.png");

/* ================= STATE ================= */
let levelIndex = 0;
let gameOver = false;
let levelWin = false;
let winTimer = 0;
let finalWin = false;
let bgX = 0;

/* ================= PLAYER ================= */
const player = {
  x:0,y:0,w:60,h:60,
  vx:0,vy:0,onGround:false
};

/* ================= PARTICLES (dragon fire text) ================= */
let particles = [];
let textTargets = [];

function generateText(text){
  textTargets = [];

  const temp = document.createElement("canvas");
  const tctx = temp.getContext("2d");

  temp.width = 800;
  temp.height = 200;

  tctx.fillStyle="white";
  tctx.font="bold 60px Arial";
  tctx.textAlign="center";
  tctx.fillText(text,400,120);

  const data = tctx.getImageData(0,0,temp.width,temp.height).data;

  for(let y=0;y<temp.height;y+=6){
    for(let x=0;x<temp.width;x+=6){
      if(data[(y*temp.width+x)*4+3]>128){
        textTargets.push({
          x: x + (canvas.width/2 - 400),
          y: y + (canvas.height/2 - 100)
        });
      }
    }
  }
}

function spawnFireText(x,y){
  for(let i=0;i<10;i++){
    const t = textTargets[Math.floor(Math.random()*textTargets.length)];
    particles.push({
      x,y,
      target:t,
      life:120
    });
  }
}

/* ================= LEVELS ================= */
const levels = [

/* EASY */
{
start:{x:40,y:420},
blocks:[
{x:0,y:500,w:960,h:40,type:'static'},
{x:300,y:430,w:160,h:30,type:'static'},
{x:600,y:360,w:160,h:30,type:'moving',vx:2,minX:550,maxX:750}
],
spikes:[{x:420,y:470,w:40,h:30}],
castle:{x:820,y:170,w:130,h:160},
dragon:{x:720,y:220}
},

/* MEDIUM */
{
start:{x:40,y:420},
blocks:[
{x:0,y:500,w:200,h:40,type:'static'},
{x:260,y:430,w:120,h:30,type:'moving',vx:2,minX:260,maxX:420},
{x:450,y:350,w:120,h:30,type:'static'},
{x:650,y:280,w:120,h:30,type:'static'}
],
spikes:[
{x:200,y:500,w:100,h:30},
{x:500,y:500,w:100,h:30}
],
castle:{x:820,y:100,w:130,h:160},
dragon:{x:720,y:160}
},

/* HARD */
{
start:{x:20,y:450},
blocks:[
{x:0,y:520,w:150,h:30,type:'static'},
{x:200,y:450,w:100,h:25,type:'moving',vx:3,minX:200,maxX:400},
{x:450,y:350,w:100,h:25,type:'moving',vx:-3,minX:350,maxX:550},
{x:700,y:180,w:200,h:30,type:'static'}
],
spikes:[
{x:150,y:520,w:450,h:30}
],
castle:{x:820,y:40,w:130,h:160},
dragon:{x:700,y:80}
}
];

let blocks=[], spikes=[], castle={}, dragon={};

function loadLevel(i){
  if(i>=levels.length){ finalWin=true; return; }

  const l=levels[i];

  blocks=l.blocks.map(b=>({...b,dir:1}));
  spikes=l.spikes;
  castle=l.castle;
  dragon=l.dragon;

  player.x=l.start.x;
  player.y=l.start.y;
  player.vx=0; player.vy=0;

  gameOver=false;
  levelWin=false;
  winTimer=0;

  generateText("LEVEL COMPLETED");
}

/* ================= INPUT ================= */
const keys={};
window.addEventListener("keydown",e=>{
  keys[e.code]=true;
  if(gameOver && e.code==="KeyR") loadLevel(levelIndex);
});
window.addEventListener("keyup",e=>keys[e.code]=false);

/* ================= COLLISION ================= */
const hit=(a,b)=>(
a.x<b.x+b.w &&
a.x+a.w>b.x &&
a.y<b.y+b.h &&
a.y+a.h>b.y
);

/* ================= UPDATE ================= */
function update(){

bgX-=CLOUD_SPEED;
if(bgX<=-canvas.width) bgX=0;

if(gameOver||finalWin) return;

/* ===== WIN ===== */
if(levelWin){
  winTimer++;

  spawnFireText(dragon.x+50,dragon.y+30);

  if(winTimer>120){
    levelIndex++;
    loadLevel(levelIndex);
  }
  return;
}

/* ===== MOVING BLOCKS ===== */
blocks.forEach(b=>{
  if(b.type==='moving'){
    b.x+=b.vx*b.dir;
    if(b.x>b.maxX||b.x<b.minX) b.dir*=-1;
  }
});

/* ===== PLAYER ===== */
player.vx=0;
if(keys.ArrowLeft) player.vx=-SPEED;
if(keys.ArrowRight) player.vx=SPEED;
if(keys.Space && player.onGround) player.vy=-JUMP;
if(keys.ArrowDown) player.vy+=FAST_FALL;

player.vy+=GRAVITY;

player.x+=player.vx;
player.y+=player.vy;

player.onGround=false;

blocks.forEach(b=>{
  if(hit(player,b) && player.vy>=0){
    player.y=b.y-player.h;
    player.vy=0;
    player.onGround=true;
  }
});

/* ===== DEATH ===== */
if(player.y>FALL_DEATH_Y) gameOver=true;
spikes.forEach(s=>{ if(hit(player,s)) gameOver=true; });

/* ===== WIN ===== */
if(hit(player,castle)) levelWin=true;

/* ===== PARTICLES ===== */
particles.forEach(p=>{
  const dx=p.target.x-p.x;
  const dy=p.target.y-p.y;
  p.x+=dx*0.15;
  p.y+=dy*0.15;
  p.life--;
});
particles=particles.filter(p=>p.life>0);
}

/* ================= DRAW ================= */
function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

ctx.drawImage(bg,bgX,0,canvas.width,canvas.height);
ctx.drawImage(bg,bgX+canvas.width,0,canvas.width,canvas.height);

blocks.forEach(b=>ctx.drawImage(blockImg,b.x,b.y,b.w,b.h));
spikes.forEach(s=>ctx.drawImage(spikeImg,s.x,s.y,s.w,s.h));

ctx.shadowColor="gold";
ctx.shadowBlur=25;
ctx.drawImage(castleImg,castle.x,castle.y,castle.w,castle.h);
ctx.shadowBlur=0;

ctx.drawImage(dragonImg,dragon.x,dragon.y,120,100);

ctx.drawImage(wizard,player.x,player.y,80,80);

/* fire text particles */
particles.forEach(p=>{
ctx.fillStyle="orange";
ctx.fillRect(p.x,p.y,3,3);
});

ctx.fillStyle="white";
ctx.font="18px Arial";
ctx.fillText("Level "+(levelIndex+1),20,30);

if(gameOver) ctx.fillText("YOU DIED - Press R",350,260);
if(finalWin) ctx.fillText("DUNGEON CLEARED!",250,260);
}

/* ================= LOOP ================= */
function loop(){
update();
draw();
requestAnimationFrame(loop);
}

loadLevel(0);
loop();

});


































































































































































































































































































































































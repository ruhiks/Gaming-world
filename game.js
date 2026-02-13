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
const FALL_DEATH_Y = canvas.height + 80;
const BG_SPEED = 0.3;

/* ================= LOAD ================= */
const load = s => { const i=new Image(); i.src=s; return i; };

const bg = load("assets/bg.png");
const wizard = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg = load("assets/castle.png");
const dragonImg = load("assets/dragon.png");

/* ================= AUDIO FIX ================= */
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;

function startMusic(){
    bgm.play().catch(()=>{});
}
window.addEventListener("keydown", startMusic, { once:true });
window.addEventListener("mousedown", startMusic, { once:true });

/* ================= STATE ================= */
let levelIndex=0, gameOver=false, levelWin=false, finalWin=false;
let bgX=0;

/* ================= PLAYER ================= */
const player={x:0,y:0,w:60,h:60,vx:0,vy:0,onGround:false};

/* ================= DRAGON ================= */
const dragon={x:0,y:0,float:0,dir:1};

/* ================= PARTICLES ================= */
let particles=[];

function spark(x,y,color="cyan"){
    for(let i=0;i<6;i++){
        particles.push({
            x,y,
            vx:(Math.random()-0.5)*3,
            vy:(Math.random()-0.5)*3,
            life:40,
            color
        });
    }
}

/* ambient sparkles */
function ambient(){
    if(Math.random()<0.2){
        particles.push({
            x:Math.random()*canvas.width,
            y:Math.random()*canvas.height,
            vx:0,
            vy:-0.3,
            life:200,
            color:"white"
        });
    }
}

/* ================= LEVELS ================= */
let blocks=[], spikes=[], castle={};

const levels=[

{
start:{x:40,y:420},
blocks:[
{x:0,y:500,w:960,h:40,type:"static"},
{x:300,y:430,w:150,h:25,type:"static"},
{x:600,y:360,w:150,h:25,type:"moving",vx:2,minX:550,maxX:750}
],
spikes:[
{x:330,y:400,w:40,h:30}
],
castle:{x:820,y:180,w:120,h:150},
dragon:{x:650,y:220}
},

{
start:{x:40,y:420},
blocks:[
{x:0,y:500,w:200,h:40,type:"static"},
{x:260,y:430,w:120,h:25,type:"moving",vx:2,minX:260,maxX:430},
{x:450,y:350,w:120,h:25,type:"static"},
{x:650,y:280,w:120,h:25,type:"moving",vx:-2,minX:550,maxX:750}
],
spikes:[
{x:500,y:320,w:40,h:30}
],
castle:{x:820,y:120,w:120,h:150},
dragon:{x:700,y:160}
},

{
start:{x:20,y:450},
blocks:[
{x:0,y:520,w:150,h:25,type:"static"},
{x:200,y:450,w:100,h:25,type:"moving",vx:3,minX:200,maxX:400},
{x:450,y:350,w:100,h:25,type:"static"},
{x:520,y:250,w:100,h:25,type:"moving",vx:-2,minX:450,maxX:650}
],
spikes:[
{x:470,y:320,w:40,h:30}
],
castle:{x:820,y:50,w:120,h:150},
dragon:{x:600,y:80}
}

];

function loadLevel(i){
if(i>=levels.length){finalWin=true;return;}

const l=levels[i];
blocks=l.blocks.map(b=>({...b,dir:1}));
spikes=l.spikes;
castle=l.castle;

player.x=l.start.x;
player.y=l.start.y;
player.vx=player.vy=0;

dragon.x=l.dragon.x;
dragon.y=l.dragon.y;

gameOver=false;
levelWin=false;
}

/* ================= INPUT ================= */
const keys={};
window.addEventListener("keydown",e=>{
keys[e.code]=true;
if(gameOver && e.code==="KeyR") loadLevel(levelIndex);
});
window.addEventListener("keyup",e=>keys[e.code]=false);

/* ================= COLLISION ================= */
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

/* ================= UPDATE ================= */
function update(){

ambient();

if(gameOver||finalWin) return;

/* background scroll */
bgX-=BG_SPEED;
if(bgX<=-canvas.width) bgX=0;

/* moving platforms */
blocks.forEach(b=>{
if(b.type==="moving"){
b.x+=b.vx*b.dir;
if(b.x>b.maxX||b.x<b.minX) b.dir*=-1;
}
});

/* dragon float */
dragon.float+=0.05;
dragon.x+=dragon.dir*0.5;
if(dragon.x>castle.x+60) dragon.dir=-1;
if(dragon.x<castle.x-140) dragon.dir=1;

/* player */
player.vx=0;
if(keys.ArrowLeft) player.vx=-SPEED;
if(keys.ArrowRight) player.vx=SPEED;

if(keys.Space && player.onGround){
player.vy=-JUMP;
spark(player.x+30,player.y+40);
}

if(keys.ArrowDown) player.vy+=FAST_FALL;

player.vy+=GRAVITY;
player.x+=player.vx;
player.y+=player.vy;

player.onGround=false;

blocks.forEach(b=>{
if(hit(player,b)&&player.vy>=0){
player.y=b.y-player.h;
player.vy=0;
player.onGround=true;
}
});

/* death */
if(player.y>FALL_DEATH_Y) gameOver=true;
spikes.forEach(s=>{if(hit(player,s)) gameOver=true});

/* win */
if(hit(player,castle)){
levelWin=true;
spark(castle.x+60,castle.y+40,"gold");
setTimeout(()=>{
levelIndex++;
loadLevel(levelIndex);
},1000);
}

/* particles */
particles.forEach(p=>{
p.x+=p.vx;
p.y+=p.vy;
p.life--;
});
particles=particles.filter(p=>p.life>0);
}

/* ================= DRAW ================= */
function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

/* moving bg */
ctx.drawImage(bg,bgX,0,canvas.width,canvas.height);
ctx.drawImage(bg,bgX+canvas.width,0,canvas.width,canvas.height);

/* blocks */
blocks.forEach(b=>ctx.drawImage(blockImg,b.x,b.y,b.w,b.h));

/* spikes */
spikes.forEach(s=>ctx.drawImage(spikeImg,s.x,s.y,s.w,s.h));

/* castle glow */
ctx.shadowColor="gold";
ctx.shadowBlur=25;
ctx.drawImage(castleImg,castle.x,castle.y,castle.w,castle.h);
ctx.shadowBlur=0;

/* dragon */
ctx.drawImage(dragonImg,dragon.x,dragon.y+Math.sin(dragon.float)*10,120,100);

/* player */
ctx.drawImage(wizard,player.x,player.y,80,80);

/* particles */
particles.forEach(p=>{
ctx.fillStyle=p.color;
ctx.fillRect(p.x,p.y,2,2);
});

ctx.fillStyle="white";
ctx.font="20px Arial";
ctx.fillText("Level "+(levelIndex+1),20,30);

if(gameOver){
ctx.fillStyle="red";
ctx.font="40px Arial";
ctx.fillText("YOU DIED - Press R",280,260);
}

if(finalWin){
ctx.fillStyle="lime";
ctx.font="50px Arial";
ctx.fillText("DUNGEON CLEARED!",220,260);
}
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
































































































































































































































































































































































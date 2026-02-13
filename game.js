"use strict";

document.addEventListener("DOMContentLoaded", () => {

/* =================================================
   CANVAS
================================================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


/* =================================================
   CONSTANTS
================================================= */
const GRAVITY = 0.8;
const SPEED = 5;
const JUMP = 16;
const FAST_FALL = 2;
const FALL_DEATH_Y = canvas.height + 80;
const CLOUD_SPEED = 0.3;


/* =================================================
   LOAD IMAGE SAFE (no 404 crash)
================================================= */
function load(src){
    const img = new Image();
    img.src = src;
    return img;
}

const bg = load("assets/bg.png");
const wizard = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg = load("assets/castle.png");
const dragonImg = load("assets/dragon.png");


/* =================================================
   AUDIO
================================================= */
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;

const deathSound = new Audio("assets/death.mp3");

window.addEventListener("keydown", ()=>bgm.play().catch(()=>{}), {once:true});


/* =================================================
   STATE
================================================= */
let levelIndex = 0;
let gameOver = false;
let levelWin = false;
let finalWin = false;

let bgX = 0;


/* =================================================
   PLAYER
================================================= */
const player = {
    x:0,y:0,w:60,h:60,
    vx:0,vy:0,
    onGround:false,
    facing:true
};


/* =================================================
   DRAGON (decorative only)
================================================= */
const dragon = {
    x:0,
    y:0,
    dir:1,
    float:0
};


/* =================================================
   PARTICLES (fire text)
================================================= */
let particles=[];

function spawn(x,y,target){
    particles.push({
        x,y,
        vx:(Math.random()-0.5)*4,
        vy:(Math.random()-0.5)*4,
        life:80,
        target
    });
}


/* =================================================
   FIRE TEXT POINTS
================================================= */
let textPoints=[];

function generateText(text){
    textPoints=[];
    const c=document.createElement("canvas");
    const t=c.getContext("2d");

    c.width=800;
    c.height=200;

    t.fillStyle="white";
    t.font="bold 70px Arial";
    t.textAlign="center";
    t.fillText(text,400,120);

    const data=t.getImageData(0,0,c.width,c.height).data;

    for(let y=0;y<c.height;y+=6){
        for(let x=0;x<c.width;x+=6){
            if(data[(y*c.width+x)*4+3]>100){
                textPoints.push({
                    x:x+80,
                    y:y+150
                });
            }
        }
    }
}


/* =================================================
   LEVELS
================================================= */
let blocks=[], spikes=[], castle={};

const levels = [

/* LEVEL 1 */
{
start:{x:40,y:420},
blocks:[
{x:0,y:500,w:960,h:40,type:"static"},
{x:300,y:430,w:160,h:30,type:"static"},
{x:600,y:360,w:160,h:30,type:"moving",vx:2,minX:550,maxX:750}
],
spikes:[{x:420,y:470,w:40,h:30}],
castle:{x:820,y:170,w:120,h:150},
dragon:{x:650,y:220}
},

/* LEVEL 2 */
{
start:{x:40,y:420},
blocks:[
{x:0,y:500,w:200,h:40,type:"static"},
{x:260,y:430,w:120,h:30,type:"moving",vy:2,minY:300,maxY:430},
{x:450,y:350,w:120,h:30,type:"static"},
{x:650,y:280,w:120,h:30,type:"static"}
],
spikes:[
{x:200,y:500,w:100,h:30},
{x:500,y:500,w:100,h:30}
],
castle:{x:820,y:100,w:120,h:150},
dragon:{x:700,y:160}
},

/* LEVEL 3 */
{
start:{x:20,y:450},
blocks:[
{x:0,y:520,w:150,h:30,type:"static"},
{x:200,y:450,w:100,h:25,type:"moving",vx:3,minX:200,maxX:400},
{x:450,y:350,w:100,h:25,type:"static"},
{x:520,y:250,w:100,h:25,type:"moving",vy:-2,minY:150,maxY:350},
{x:700,y:180,w:200,h:30,type:"static"}
],
spikes:[
{x:150,y:520,w:450,h:30}
],
castle:{x:820,y:40,w:120,h:150},
dragon:{x:600,y:80}
}
];


/* =================================================
   LOAD LEVEL
================================================= */
function loadLevel(i){

    if(i>=levels.length){
        finalWin=true;
        return;
    }

    const l=levels[i];

    blocks=l.blocks.map(b=>({...b,dir:1}));
    spikes=l.spikes;
    castle=l.castle;

    player.x=l.start.x;
    player.y=l.start.y;
    player.vx=0;
    player.vy=0;

    dragon.x=l.dragon.x;
    dragon.y=l.dragon.y;

    generateText("LEVEL COMPLETED");

    levelWin=false;
    gameOver=false;
}


/* =================================================
   INPUT
================================================= */
const keys={};

window.addEventListener("keydown",e=>{
    keys[e.code]=true;

    if(gameOver && e.code==="KeyR"){
        loadLevel(levelIndex);
    }
});
window.addEventListener("keyup",e=>keys[e.code]=false);


/* =================================================
   COLLISION
================================================= */
const hit=(a,b)=>
a.x<b.x+b.w &&
a.x+a.w>b.x &&
a.y<b.y+b.h &&
a.y+a.h>b.y;


/* =================================================
   UPDATE
================================================= */
function update(){

bgX-=CLOUD_SPEED;
if(bgX<=-canvas.width) bgX=0;

if(gameOver||finalWin) return;


/* ===== LEVEL WIN ===== */
if(levelWin){

    for(let i=0;i<5;i++){
        const t=textPoints[Math.floor(Math.random()*textPoints.length)];
        spawn(dragon.x+60,dragon.y+40,t);
    }

    if(particles.length>400){
        levelIndex++;
        loadLevel(levelIndex);
    }

    return;
}


/* ===== DRAGON FLY ===== */
dragon.float+=0.05;
dragon.x+=dragon.dir*0.6;

if(dragon.x>castle.x+60) dragon.dir=-1;
if(dragon.x<castle.x-140) dragon.dir=1;


/* ===== MOVING BLOCKS ===== */
blocks.forEach(b=>{
    if(b.type==="moving"){
        if(b.vx){
            b.x+=b.vx*b.dir;
            if(b.x>b.maxX||b.x<b.minX) b.dir*=-1;
        }
        if(b.vy){
            b.y+=b.vy*b.dir;
            if(b.y>b.maxY||b.y<b.minY) b.dir*=-1;
        }
    }
});


/* ===== PLAYER ===== */
player.vx=0;

if(keys.ArrowLeft){player.vx=-SPEED;player.facing=false;}
if(keys.ArrowRight){player.vx=SPEED;player.facing=true;}

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
if(player.y>FALL_DEATH_Y){
    gameOver=true;
    deathSound.play();
}

spikes.forEach(s=>{
    if(hit(player,s)){
        gameOver=true;
        deathSound.play();
    }
});


/* ===== CASTLE ===== */
if(hit(player,castle)){
    levelWin=true;
}


/* ===== PARTICLES ===== */
particles.forEach(p=>{
    if(p.target){
        p.x+=(p.target.x-p.x)*0.1;
        p.y+=(p.target.y-p.y)*0.1;
    }else{
        p.x+=p.vx;
        p.y+=p.vy;
    }
    p.life--;
});

particles=particles.filter(p=>p.life>0);
}


/* =================================================
   DRAW
================================================= */
function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);


/* background */
ctx.fillStyle="#201030";
ctx.fillRect(0,0,canvas.width,canvas.height);

if(bg.complete){
ctx.globalAlpha=0.3;
ctx.drawImage(bg,bgX,0,canvas.width,canvas.height);
ctx.drawImage(bg,bgX+canvas.width,0,canvas.width,canvas.height);
ctx.globalAlpha=1;
}


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
const floatY=Math.sin(dragon.float)*10;
ctx.drawImage(dragonImg,dragon.x,dragon.y+floatY,120,100);


/* player */
ctx.drawImage(wizard,player.x,player.y,80,80);


/* particles */
ctx.fillStyle="orange";
particles.forEach(p=>{
    ctx.fillRect(p.x,p.y,2,2);
});


/* UI */
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
ctx.fillText("DUNGEON CLEARED!",250,260);
}
}


/* =================================================
   LOOP
================================================= */
function loop(){
update();
draw();
requestAnimationFrame(loop);
}


/* =================================================
   START
================================================= */
loadLevel(0);
loop();

});































































































































































































































































































































































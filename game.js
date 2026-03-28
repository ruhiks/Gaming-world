"use strict";

document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */

const GRAVITY = 0.8;
const SPEED = 4.5;
const JUMP = 15;
const FAST_FALL = 1.5;
const CLOUD_SPEED = 0.3;
const FALL_DEATH_Y = canvas.height + 50;

/* ================= STATE ================= */

let levelIndex = 0;
let levelWin = false;
let finalWin = false;
let transitioning = false;
let winTimer = 0;
let bgX = 0;

/* ================= ASSETS ================= */

const load = src => { const i = new Image(); i.src = src; return i; };

const bg = load("assets/bg.png");
const wizard = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg = load("assets/castle.png");
const dragonImg = load("assets/dragon.png");

/* ================= PLAYER ================= */

const player = {
    x: 0, y: 0,
    w: 60, h: 60,
    vx: 0, vy: 0,
    onGround: false,
    facing: true
};

/* ================= PARTICLES ================= */

let particles = [];

function spawnParticle(x, y, color, vx, vy, life=60, size=3){
    particles.push({x,y,vx,vy,life,size,color});
}

/* ================= LEVEL DATA ================= */

const levels = [

{
    start:{x:40,y:420},
    blocks:[
        {x:0,y:500,w:960,h:40,type:'static'},
        {x:300,y:430,w:160,h:30,type:'static'},
        {x:600,y:360,w:160,h:30,type:'moving',vx:2,minX:550,maxX:750}
    ],
    spikes:[
        {x:420,y:470,w:40,h:30}
    ],
    castle:{x:820,y:170,w:130,h:160},
    dragon:{x:720,y:240}
},

{
    start:{x:40,y:420},
    blocks:[
        {x:0,y:500,w:200,h:40,type:'static'},
        {x:260,y:430,w:120,h:30,type:'moving',vy:2,minY:300,maxY:430},
        {x:450,y:350,w:120,h:30,type:'static'},
        {x:650,y:280,w:120,h:30,type:'static'}
    ],
    spikes:[
        {x:200,y:500,w:100,h:30},
        {x:500,y:500,w:100,h:30}
    ],
    castle:{x:820,y:100,w:130,h:160},
    dragon:{x:730,y:180}
},

{
    start:{x:20,y:450},
    blocks:[
        {x:0,y:520,w:150,h:30,type:'static'},
        {x:200,y:450,w:100,h:25,type:'moving',vx:3,minX:200,maxX:400},
        {x:360,y:350,w:100,h:25,type:'static'},
        {x:520,y:250,w:100,h:25,type:'moving',vy:-2,minY:150,maxY:350},
        {x:700,y:180,w:200,h:30,type:'static'}
    ],
    spikes:[
        {x:150,y:520,w:450,h:30}
    ],
    castle:{x:820,y:40,w:130,h:160},
    dragon:{x:730,y:100}
}

];

let blocks=[], spikes=[], castle={}, dragon={};

/* ================= LOAD LEVEL ================= */

function loadLevel(i){

    if(i>=levels.length){
        finalWin=true;
        return;
    }

    const l = levels[i];

    blocks = l.blocks.map(b=>({...b,dir:1}));
    spikes = l.spikes;
    castle = l.castle;
    dragon = l.dragon;

    player.x=l.start.x;
    player.y=l.start.y;
    player.vx=0;
    player.vy=0;

    levelWin=false;
    winTimer=0;
    transitioning=false;
}

/* ================= INPUT ================= */

const keys={};

window.addEventListener("keydown",e=>{
    keys[e.code]=true;
    if(e.code==="KeyR"){
        levelIndex=0;
        finalWin=false;
        loadLevel(0);
    }
});

window.addEventListener("keyup",e=>keys[e.code]=false);

/* ================= COLLISION ================= */

const hit=(a,b)=>
    a.x < b.x+b.w &&
    a.x+a.w > b.x &&
    a.y < b.y+b.h &&
    a.y+a.h > b.y;

/* ================= UPDATE ================= */

function update(){

bgX-=CLOUD_SPEED;
if(bgX<=-canvas.width) bgX=0;

if(finalWin) return;

/* WIN STATE */

if(levelWin){

    winTimer++;

    // dragon fire forms text
    if(winTimer<150){
        for(let i=0;i<6;i++)
            spawnParticle(dragon.x,dragon.y+40,"orange",
                -3-Math.random()*3,
                (Math.random()-0.5)*2,
                80,4);
    }

    if(winTimer>180 && !transitioning){
        transitioning=true;
        levelIndex++;
        loadLevel(levelIndex);
    }

    return;
}

/* MOVE PLATFORMS */

blocks.forEach(b=>{
    if(b.type==='moving'){
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

/* PLAYER */

player.vx=0;

if(keys.ArrowLeft){ player.vx=-SPEED; player.facing=false; }
if(keys.ArrowRight){ player.vx=SPEED; player.facing=true; }

if(keys.Space && player.onGround){
    player.vy=-JUMP;
    for(let i=0;i<10;i++)
        spawnParticle(player.x+30,player.y+60,"gold",
            (Math.random()-0.5)*3,
            Math.random()*-3,40,3);
}

if(keys.ArrowDown) player.vy+=FAST_FALL;

player.vy+=GRAVITY;

player.x+=player.vx;
player.y+=player.vy;

player.onGround=false;

blocks.forEach(b=>{
    if(hit(player,b) && player.vy>=0 &&
       player.y+player.h-player.vy<=b.y+5){
        player.y=b.y-player.h;
        player.vy=0;
        player.onGround=true;
        if(b.type==='moving' && b.vx)
            player.x+=b.vx*b.dir;
    }
});

/* DEATH */

if(player.y>FALL_DEATH_Y)
    loadLevel(levelIndex);

spikes.forEach(s=>{
    if(hit(player,s))
        loadLevel(levelIndex);
});

/* CASTLE */

if(hit(player,castle))
    levelWin=true;

/* PARTICLES */

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

/* BACKGROUND */

ctx.drawImage(bg,bgX,0,canvas.width,canvas.height);
ctx.drawImage(bg,bgX+canvas.width,0,canvas.width,canvas.height);

/* BLOCKS */

blocks.forEach(b=>{
    ctx.drawImage(blockImg,b.x,b.y,b.w,b.h);
});

/* SPIKES */

spikes.forEach(s=>{
    ctx.drawImage(spikeImg,s.x,s.y,s.w,s.h);
});

/* CASTLE SPARKLE */

ctx.save();
ctx.shadowColor="gold";
ctx.shadowBlur=25+Math.sin(Date.now()*0.005)*10;
ctx.drawImage(castleImg,castle.x,castle.y,castle.w,castle.h);
ctx.restore();

/* DRAGON */

ctx.drawImage(dragonImg,dragon.x,dragon.y,120,100);

/* PLAYER */

ctx.drawImage(wizard,player.x,player.y,80,80);

/* PARTICLES */

particles.forEach(p=>{
    ctx.globalAlpha=p.life/80;
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
});

/* UI */

ctx.fillStyle="white";
ctx.font="20px Arial";
ctx.fillText("Level "+(levelIndex+1),20,30);

if(levelWin){
    ctx.save();
    ctx.textAlign="center";
    ctx.font="bold 60px serif";
    ctx.shadowColor="gold";
    ctx.shadowBlur=30;
    ctx.fillText("LEVEL COMPLETED",canvas.width/2,canvas.height/2);
    ctx.restore();
}

if(finalWin){
    ctx.fillStyle="white";
    ctx.font="60px serif";
    ctx.textAlign="center";
    ctx.fillText("DUNGEON CLEARED!",canvas.width/2,canvas.height/2);
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

























































































































































































































































































































































































































































































































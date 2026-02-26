"use strict";

document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */

const GRAVITY = 0.8;
const SPEED = 4;
const JUMP = 14;
const CLOUD_SPEED = 0.4;

/* ================= GAME STATE ================= */

let levelIndex = 0;
let levelWin = false;
let finalWin = false;
let winTimer = 0;
let bgX = 0;

/* ================= LOAD IMAGES ================= */

const load = src => { const i = new Image(); i.src = src; return i; };

const bg = load("assets/bg.png");
const wizard = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg = load("assets/castle.png");
const dragonImg = load("assets/dragon.png");

/* ================= PLAYER ================= */

const player = {
    x: 0,
    y: 0,
    w: 60,
    h: 60,
    vx: 0,
    vy: 0,
    onGround: false
};

/* ================= PARTICLES ================= */

let particles = [];

function spawnFire(x,y){
    particles.push({
        x:x,
        y:y,
        vx:-3 - Math.random()*3,
        vy:(Math.random()-0.5)*2,
        life:80,
        size:4
    });
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
    spikes:[{x:420,y:470,w:40,h:30}],
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
    spikes:[{x:150,y:520,w:450,h:30}],
    castle:{x:820,y:40,w:130,h:160},
    dragon:{x:730,y:100}
}

];

let blocks=[], spikes=[], castle={}, dragon={};

/* ================= LOAD LEVEL ================= */

function loadLevel(i){

    if(i >= levels.length){
        finalWin = true;
        levelWin = false;
        return;
    }

    const l = levels[i];

    blocks = l.blocks.map(b=>({...b,dir:1}));
    spikes = l.spikes;
    castle = l.castle;
    dragon = l.dragon;

    player.x = l.start.x;
    player.y = l.start.y;
    player.vx = 0;
    player.vy = 0;

    levelWin = false;
    winTimer = 0;
}

/* ================= INPUT ================= */

const keys = {};

window.addEventListener("keydown", e=>{
    keys[e.code] = true;

    if(e.code === "KeyR"){
        levelIndex = 0;
        finalWin = false;
        loadLevel(0);
    }
});

window.addEventListener("keyup", e=> keys[e.code]=false);

/* ================= COLLISION ================= */

const hit = (a,b)=>
a.x < b.x+b.w &&
a.x+a.w > b.x &&
a.y < b.y+b.h &&
a.y+a.h > b.y;

/* ================= UPDATE ================= */

function update(){

bgX -= CLOUD_SPEED;
if(bgX <= -canvas.width) bgX = 0;

if(finalWin) return;

/* WIN STATE */

if(levelWin){

    winTimer++;

    // Dragon always emits fire
    for(let i=0;i<6;i++)
        spawnFire(dragon.x, dragon.y+40);

    if(winTimer > 120){
        levelIndex++;
        loadLevel(levelIndex);
    }

    return;
}

/* MOVE PLATFORMS */

blocks.forEach(b=>{
    if(b.type === 'moving'){
        if(b.vx){
            b.x += b.vx * b.dir;
            if(b.x > b.maxX || b.x < b.minX) b.dir *= -1;
        }
        if(b.vy){
            b.y += b.vy * b.dir;
            if(b.y > b.maxY || b.y < b.minY) b.dir *= -1;
        }
    }
});

/* PLAYER MOVEMENT */

player.vx = 0;

if(keys.ArrowLeft) player.vx = -SPEED;
if(keys.ArrowRight) player.vx = SPEED;

if(keys.Space && player.onGround)
    player.vy = -JUMP;

player.vy += GRAVITY;

player.x += player.vx;
player.y += player.vy;

player.onGround = false;

blocks.forEach(b=>{
    if(hit(player,b) && player.vy>=0 &&
       player.y+player.h-player.vy<=b.y+5){
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        if(b.type==='moving' && b.vx)
            player.x += b.vx * b.dir;
    }
});

/* DEATH */

if(player.y > canvas.height + 50)
    loadLevel(levelIndex);

spikes.forEach(s=>{
    if(hit(player,s))
        loadLevel(levelIndex);
});

/* CASTLE */

if(hit(player,castle))
    levelWin = true;

/* PARTICLES */

particles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
});

particles = particles.filter(p=>p.life>0);

}

/* ================= DRAW ================= */

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

ctx.drawImage(bg,bgX,0,canvas.width,canvas.height);
ctx.drawImage(bg,bgX+canvas.width,0,canvas.width,canvas.height);

blocks.forEach(b=>{
    ctx.drawImage(blockImg,b.x,b.y,b.w,b.h);
});

spikes.forEach(s=>{
    ctx.drawImage(spikeImg,s.x,s.y,s.w,s.h);
});

ctx.save();
ctx.shadowColor="gold";
ctx.shadowBlur=30;
ctx.drawImage(castleImg,castle.x,castle.y,castle.w,castle.h);
ctx.restore();

ctx.drawImage(dragonImg,dragon.x,dragon.y,120,100);

ctx.drawImage(wizard,player.x,player.y,80,80);

particles.forEach(p=>{
    ctx.globalAlpha=p.life/80;
    ctx.fillStyle="orange";
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
});

ctx.fillStyle="white";
ctx.font="20px Arial";
ctx.fillText("Level "+(levelIndex+1),20,30);

if(levelWin){
    ctx.textAlign="center";
    ctx.font="bold 60px serif";
    ctx.fillText("LEVEL COMPLETED",canvas.width/2,canvas.height/2);
}

if(finalWin){
    ctx.textAlign="center";
    ctx.font="60px serif";
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
    






































































































































































































































































































































































































































































































































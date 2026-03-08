const video=document.getElementById("video")

const ascii=document.getElementById("ascii")
const process=document.getElementById("process")

const ctx=ascii.getContext("2d")
const pctx=process.getContext("2d")

const bwBtn=document.getElementById("bw")
const colorBtn=document.getElementById("color")

let mode="bw"

const chars="█▓▒@#MWB8&%$+=-:. "

let faces=[]

navigator.mediaDevices.getUserMedia({
video:{facingMode:"user"}
}).then(stream=>{
video.srcObject=stream
})

const faceDetection=new FaceDetection({
locateFile:(file)=>{
return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
}
})

faceDetection.setOptions({
model:"short",
minDetectionConfidence:0.5
})

faceDetection.onResults(results=>{

faces=[]

if(results.detections){

for(let d of results.detections){

let box=d.boundingBox

faces.push({
x:box.xCenter-box.width/2,
y:box.yCenter-box.height/2,
w:box.width,
h:box.height
})

}

}

})

async function detectFaces(){

await faceDetection.send({image:video})

requestAnimationFrame(detectFaces)

}

video.onloadeddata=()=>{

ascii.width=640
ascii.height=480

process.width=64
process.height=48

detectFaces()

draw()

}

bwBtn.onclick=()=>mode="bw"
colorBtn.onclick=()=>mode="color"

function insideFace(x,y){

for(let f of faces){

let fx=f.x*process.width
let fy=f.y*process.height
let fw=f.w*process.width
let fh=f.h*process.height

if(x>fx && x<fx+fw && y>fy && y<fy+fh){
return true
}

}

return false

}

function draw(){

let vw=video.videoWidth
let vh=video.videoHeight

let targetRatio=4/3
let videoRatio=vw/vh

let sx=0
let sy=0
let sw=vw
let sh=vh

if(videoRatio>targetRatio){

sw=vh*targetRatio
sx=(vw-sw)/2

}else{

sh=vw/targetRatio
sy=(vh-sh)/2

}

pctx.drawImage(video,sx,sy,sw,sh,0,0,process.width,process.height)

let frame=pctx.getImageData(0,0,process.width,process.height)
let data=frame.data

ctx.fillStyle="black"
ctx.fillRect(0,0,ascii.width,ascii.height)

let cw=ascii.width/process.width
let ch=ascii.height/process.height

for(let y=0;y<process.height;y++){

for(let x=0;x<process.width;x++){

let i=(y*process.width+x)*4

let r=data[i]
let g=data[i+1]
let b=data[i+2]

let brightness=(r*0.299+g*0.587+b*0.114)

let char=chars[Math.floor(brightness/255*(chars.length-1))]

let px=x*cw
let py=y*ch

let face=insideFace(x,y)

if(face){

ctx.font="bold "+(ch*1.5)+"px monospace"

ctx.fillStyle="white"

char="█"

ctx.fillText(char,px,py)

}else{

ctx.font="bold "+(ch*1.1)+"px monospace"

if(mode==="bw"){

let index=Math.floor(brightness/255*(chars.length-1))
char=chars[index]

ctx.fillStyle="white"

}else{

ctx.fillStyle="rgb("+r+","+g+","+b+")"

}

ctx.fillText(char,px,py)

}

}

}

requestAnimationFrame(draw)

}

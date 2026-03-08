const video = document.getElementById("video")
const ascii = document.getElementById("ascii")
const process = document.getElementById("process")

const ctx = ascii.getContext("2d")
const pctx = process.getContext("2d")

const bwBtn = document.getElementById("bw")
const colorBtn = document.getElementById("color")
const switchBtn = document.getElementById("switchCam")

let mode = "bw"

// Simbol untuk ASCII normal
const asciiChars = "█▓▒@#MWB8&%$+=-:.!~^*/<>?|"
// Simbol wajah 0/1
const faceChars = "01"

let faces = []
let usingFrontCamera = true
let boxScale = 4 // ukuran kotak grid

// Kamera
let stream = null
async function startCamera(front){
    if(stream){
        stream.getTracks().forEach(track => track.stop())
    }
    stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: front ? "user" : "environment" }
    })
    video.srcObject = stream
    usingFrontCamera = front
}
startCamera(true)

// Face Detection (hanya kamera depan)
let faceDetection = null
if("FaceDetection" in window){
    faceDetection = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
    })
    faceDetection.setOptions({model:"short", minDetectionConfidence:0.5})
    faceDetection.onResults(results=>{
        faces = []
        if(results.detections){
            for(let d of results.detections){
                let box = d.boundingBox
                faces.push({
                    x: box.xCenter - box.width/2,
                    y: box.yCenter - box.height/2,
                    w: box.width,
                    h: box.height
                })
            }
        }
    })
}

// Deteksi wajah tiap frame
async function detectFaces(){
    if(faceDetection && usingFrontCamera){
        await faceDetection.send({image: video})
    }
    requestAnimationFrame(detectFaces)
}

video.onloadeddata = () => {
    ascii.width = 640
    ascii.height = 480

    process.width = 64
    process.height = 48

    detectFaces()
    draw()
}

// Tombol
bwBtn.onclick = () => mode = "bw"
colorBtn.onclick = () => mode = "color"
switchBtn.onclick = () => startCamera(!usingFrontCamera)

// Cek apakah pixel di dalam wajah
function insideFace(x, y){
    if(!usingFrontCamera) return false
    for(let f of faces){
        let fx = f.x * process.width
        let fy = f.y * process.height
        let fw = f.w * process.width
        let fh = f.h * process.height
        if(x > fx && x < fx + fw && y > fy && y < fy + fh) return true
    }
    return false
}

// Draw ASCII
function draw(){
    let vw = video.videoWidth
    let vh = video.videoHeight

    let targetRatio = 4/3
    let videoRatio = vw / vh

    let sx=0, sy=0, sw=vw, sh=vh
    if(videoRatio > targetRatio){
        sw = vh * targetRatio
        sx = (vw - sw)/2
    } else {
        sh = vw / targetRatio
        sy = (vh - sh)/2
    }

    pctx.drawImage(video, sx, sy, sw, sh, 0, 0, process.width, process.height)
    let frame = pctx.getImageData(0,0,process.width,process.height)
    let data = frame.data

    ctx.fillStyle = "black"
    ctx.fillRect(0,0,ascii.width,ascii.height)

    let cw = ascii.width / process.width
    let ch = ascii.height / process.height
    let boxSize = Math.min(cw,ch) * boxScale // square kotak

    for(let y=0; y<process.height; y++){
        for(let x=0; x<process.width; x++){
            let i = (y * process.width + x) * 4
            let r = data[i]
            let g = data[i+1]
            let b = data[i+2]
            let brightness = (r*0.299 + g*0.587 + b*0.114) * (mode==="color"?1.8:1)
            brightness = Math.min(brightness,255)
            let char = asciiChars[Math.floor(brightness/255*(asciiChars.length-1))]
            let px = x * cw
            let py = y * ch

            let face = insideFace(x, y)

            if(face){
                ctx.font = "bold " + ch + "px monospace"
                ctx.fillStyle = "red"

                // Kotak wajah: square grid boxScale x boxScale
                for(let dy=0; dy<boxScale; dy++){
                    for(let dx=0; dx<boxScale; dx++){
                        let px2 = px + dx * Math.min(cw,ch)
                        let py2 = py + dy * Math.min(cw,ch)
                        let randomChar = faceChars[Math.floor(Math.random()*faceChars.length)]
                        ctx.fillText(randomChar, px2, py2)
                    }
                }
            } else {
                ctx.font = "bold " + ch + "px monospace"
                if(mode==="bw"){
                    let index = Math.floor(brightness/255*(asciiChars.length-1))
                    char = asciiChars[index]
                    ctx.fillStyle = "white"
                } else {
                    ctx.fillStyle = `rgb(${r},${g},${b})`
                }
                ctx.fillText(char, px, py)
            }
        }
    }

    requestAnimationFrame(draw)
}

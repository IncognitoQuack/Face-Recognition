const video = document.getElementById('video');
const cameraCanvas = document.getElementById('cameraCanvas');
const cameraLog = document.getElementById('camera-log');
const cameraSummary = document.getElementById('cameraSummary');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const cameraTab = document.getElementById('cameraTab');
const imageTab = document.getElementById('imageTab');
const cameraContent = document.getElementById('cameraContent');
const imageContent = document.getElementById('imageContent');

const imageUpload = document.getElementById('imageUpload');
const imageUrlInput = document.getElementById('imageUrl');
const urlSubmit = document.getElementById('urlSubmit');
const dropZone = document.getElementById('dropZone');
const uploadedImage = document.getElementById('uploadedImage');
const imageCanvas = document.getElementById('imageCanvas');
const resultsContainer = document.getElementById('results');

let expressionData = {};
let isCameraRunning = false;
let latestExpressions = {};
let videoInterval = null;

// Switch tabs
cameraTab.addEventListener('click', () => {
  cameraContent.classList.add('active');
  imageContent.classList.remove('active');
  cameraTab.classList.add('active');
  imageTab.classList.remove('active');
});

imageTab.addEventListener('click', () => {
  cameraContent.classList.remove('active');
  imageContent.classList.add('active');
  cameraTab.classList.remove('active');
  imageTab.classList.add('active');
});

// Load face-api.js models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startCamera);

// Start camera feed
function startCamera() {
  startButton.addEventListener('click', () => {
    if (!isCameraRunning) {
      navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
          video.srcObject = stream;
          isCameraRunning = true;
          video.play();
          startAnalyzingVideo();
        })
        .catch(err => console.error('Error accessing webcam:', err));
    }
  });

  stopButton.addEventListener('click', () => {
    if (isCameraRunning) {
      video.srcObject.getTracks().forEach(track => track.stop());
      clearInterval(videoInterval);
      isCameraRunning = false;
      displayCameraSummary();
    }
  });
}

// Start analyzing the video feed for expressions
function startAnalyzingVideo() {
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(cameraCanvas, displaySize);

  expressionData = {};

  videoInterval = setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    cameraCanvas.getContext('2d').clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
    faceapi.draw.drawDetections(cameraCanvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(cameraCanvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(cameraCanvas, resizedDetections);

    if (detections.length > 0) {
      latestExpressions = detections[0].expressions;
      logDominantExpression(latestExpressions);
      updateExpressionData(latestExpressions);
    }
  }, 100);
}

// Log the dominant expression to the sidebar
function logDominantExpression(expressions) {
  const dominantExpression = getDominantExpression(expressions);
  const logEntry = document.createElement('p');
  logEntry.textContent = `Dominant expression: ${dominantExpression}`;
  cameraLog.appendChild(logEntry);
}

// Determine the dominant expression from the detected expressions
function getDominantExpression(expressions) {
  return Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
}

// Update the expression data for the summary
function updateExpressionData(expressions) {
  for (let [expression, value] of Object.entries(expressions)) {
    if (!expressionData[expression]) {
      expressionData[expression] = 0;
    }
    expressionData[expression] += value;
  }
}

// Display the summary when the video stops
function displayCameraSummary() {
  cameraSummary.innerHTML = '<h3>Summary of Expressions</h3>';
  const totalFrames = Object.values(expressionData).reduce((acc, val) => acc + val, 0);

  for (let [expression, total] of Object.entries(expressionData)) {
    const percentage = ((total / totalFrames) * 100).toFixed(2);
    const p = document.createElement('p');
    p.textContent = `${expression}: ${percentage}%`;
    cameraSummary.appendChild(p);
  }
}

// Handle image upload for static analysis
imageUpload.addEventListener('change', handleImageUpload);
dropZone.addEventListener('drop', handleImageDrop);
dropZone.addEventListener('dragover', event => event.preventDefault());
urlSubmit.addEventListener('click', () => handleImageUrl(imageUrlInput.value));

function handleImageUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = () => analyzeImage(reader.result);
  reader.readAsDataURL(file);
}

function handleImageDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  const reader = new FileReader();
  reader.onload = () => analyzeImage(reader.result);
  reader.readAsDataURL(file);
}

function handleImageUrl(url) {
  analyzeImage(url);
}

// Analyze uploaded image for expressions
async function analyzeImage(imageSrc) {
  uploadedImage.src = imageSrc;
  uploadedImage.onload = async () => {
    const displaySize = { width: uploadedImage.width, height: uploadedImage.height };
    faceapi.matchDimensions(imageCanvas, displaySize);

    const detections = await faceapi.detectAllFaces(uploadedImage, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    imageCanvas.getContext('2d').clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    faceapi.draw.drawDetections(imageCanvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(imageCanvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(imageCanvas, resizedDetections);

    displayResults(detections);
  };
}

// Display expressions for the analyzed image
function displayResults(detections) {
  resultsContainer.innerHTML = '<h3>Detected Expressions</h3>';
  if (detections.length === 0) {
    resultsContainer.innerHTML += '<p>No face detected.</p>';
    return;
  }

  const expressions = detections[0].expressions;
  for (const [expression, confidence] of Object.entries(expressions)) {
    const p = document.createElement('p');
    p.textContent = `${expression}: ${(confidence * 100).toFixed(2)}%`;
    resultsContainer.appendChild(p);
  }
} 
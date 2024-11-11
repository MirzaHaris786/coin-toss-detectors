let model;
const video = document.getElementById('camera');
const captureButton = document.getElementById('captureButton');
const sendButton = document.getElementById('sendButton');
const previewImage = document.getElementById('previewImage');
const outcomeText = document.getElementById('outcome');
const confidenceText = document.getElementById('confidence');
const initialsInput = document.getElementById('initials');
const rearCameraButton = document.getElementById('rearCameraButton');
const imageUpload = document.getElementById('imageUpload');
let currentStream = null;
 
// Load the trained model
async function loadModel() {
    try {
        model = await tf.loadLayersModel('heads_tails_model/model.json');
        console.log("Model loaded successfully");
    } catch (error) {
        console.error("Error loading model:", error);
        alert("Failed to load the model.");
    }
}

// Start the camera with specified facing mode (always rear camera)
async function startCamera(facingMode = "environment") {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = { video: { facingMode: { exact: facingMode } }};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        currentStream = stream;
    } catch (error) {
        console.warn(`Exact facingMode '${facingMode}' failed, trying 'ideal' mode.`);
        try {
            const fallbackConstraints = { video: { facingMode: { ideal: facingMode }}};
            const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            video.srcObject = fallbackStream;
            currentStream = fallbackStream;
        } catch (fallbackError) {
            console.error("Unable to access camera:", fallbackError);
            alert("Unable to access the rear camera. Please check camera permissions.");
        }
    }
}

// Capture image and analyze it
async function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    previewImage.src = canvas.toDataURL('image/png');
    previewImage.style.display = 'block';

    const { outcome, confidence } = await analyzeImage(canvas);
    outcomeText.textContent = `Outcome: ${outcome}`;
    confidenceText.textContent = `Confidence: ${confidence}%`;
    sendButton.style.display = 'inline';
}

// Analyze captured image using the model
async function analyzeImage(canvas) {
    const img = tf.browser.fromPixels(canvas)
        .resizeBilinear([224, 224])
        .expandDims(0)
        .toFloat()
        .div(255.0);

    try {
        const prediction = model.predict(img);
        const predictionArray = await prediction.array();
        const confidenceHeads = predictionArray[0][0];
        const confidenceTails = predictionArray[0][1];

        const outcome = confidenceHeads > confidenceTails ? 'Heads' : 'Tails';
        const confidence = (Math.max(confidenceHeads, confidenceTails) * 100).toFixed(2);

        img.dispose();
        return { outcome, confidence };
    } catch (error) {
        console.error("Error during prediction:", error);
        return { outcome: "Unknown", confidence: "0" };
    }
}

// Handle image upload and analyze it
imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0);

            previewImage.src = canvas.toDataURL('image/png');
            previewImage.style.display = 'block';

            const { outcome, confidence } = await analyzeImage(canvas);
            outcomeText.textContent = `Outcome: ${outcome}`;
            confidenceText.textContent = `Confidence: ${confidence}%`;
            sendButton.style.display = 'inline';
        };
    }
});

// Send the result with user initials
sendButton.addEventListener('click', () => {
    const initials = initialsInput.value.trim();
    if (!initials) {
        alert("Please enter your initials.");
        return;
    }
    const outcome = outcomeText.textContent.replace("Outcome: ", "");
    const confidence = confidenceText.textContent.replace("Confidence: ", "");

    console.log('Sending result:', { initials, outcome, confidence });

    previewImage.style.display = 'none';
    sendButton.style.display = 'none';
    outcomeText.textContent = "Outcome: --";
    confidenceText.textContent = "Confidence: --";
    alert('Result sent!');
});

// Load the model and start rear camera on page load
window.onload = function() {
    loadModel();
    startCamera("environment");
};

// Capture image on capture button click
captureButton.addEventListener('click', captureImage);
rearCameraButton.addEventListener('click', () => startCamera("environment"));

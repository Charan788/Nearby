import * as faceapi from 'face-api.js'

// Models hosted on jsDelivr CDN — faster than raw GitHub in India
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

let modelsLoaded = false
let loadingPromise = null

export async function loadModels() {
  if (modelsLoaded) return
  if (loadingPromise) return loadingPromise

  loadingPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => { modelsLoaded = true })

  return loadingPromise
}

async function detect(input) {
  return faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor()
}

/**
 * Liveness check: captures two frames and checks for any movement.
 * Very relaxed threshold — just rules out a completely static image.
 */
export async function checkLiveness(videoEl) {
  const frameA = await detect(videoEl)
  if (!frameA) {
    return { live: false, reason: 'No face detected. Move closer to the camera and make sure your face is well lit.' }
  }

  await new Promise((r) => setTimeout(r, 500))
  const frameB = await detect(videoEl)

  if (!frameB) {
    return { live: false, reason: 'Face lost during check. Hold still and keep your face in frame.' }
  }

  // Very relaxed — any movement at all passes. Just catches a static printed photo.
  const movement = averageLandmarkShift(frameA.landmarks, frameB.landmarks)
  const live = movement > 0.1

  return {
    live,
    reason: live ? null : 'Please hold the camera still and look directly at it.',
    descriptor: frameB.descriptor,
  }
}

function averageLandmarkShift(a, b) {
  const pointsA = a.positions
  const pointsB = b.positions
  let total = 0
  for (let i = 0; i < pointsA.length; i++) {
    total += Math.sqrt(
      Math.pow(pointsA[i].x - pointsB[i].x, 2) +
      Math.pow(pointsA[i].y - pointsB[i].y, 2)
    )
  }
  return total / pointsA.length
}

/**
 * Face match — relaxed threshold (0.65 instead of 0.5) to account for
 * lighting differences between the profile photo and live selfie.
 */
export async function compareFaces(profileImageEl, liveDescriptor) {
  const profileResult = await detect(profileImageEl)
  if (!profileResult) {
    return { match: true, distance: null, reason: null } // if profile photo has no detectable face, skip match check and let human review decide
  }
  const distance = faceapi.euclideanDistance(profileResult.descriptor, liveDescriptor)
  return {
    match: distance < 0.65,
    distance: Number(distance.toFixed(3)),
    reason: distance < 0.65 ? null : 'Selfie doesn\'t match the profile photo clearly enough.'
  }
}

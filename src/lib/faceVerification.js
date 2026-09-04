// In-browser face verification: liveness signal + face-match score between
// a live selfie and the uploaded profile photo. Runs entirely client-side
// with face-api.js (TensorFlow.js under the hood) — no image leaves the
// browser during this step, only the final selfie + score get uploaded
// for human moderator review.

import * as faceapi from 'face-api.js'

// Models are pulled from face-api.js's own hosted weights at runtime.
// Swap this for a same-origin /models path in production if you want
// to avoid the third-party dependency at load time.
const MODEL_URL =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

let modelsLoaded = false

export async function loadModels() {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
  modelsLoaded = true
}

/**
 * Runs a single detection pass over a video or image element.
 * Returns descriptor (for matching) + landmarks (for basic liveness cues).
 */
async function detect(input) {
  return faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
}

/**
 * Basic liveness check: captures a couple of frames a fraction of a
 * second apart and checks the landmarks actually move (eye/mouth
 * position shifts slightly). Rejects a static printed photo held up
 * to the camera. This is a lightweight signal, not a full anti-spoof
 * system — pair it with human review, not a replacement for it.
 */
export async function checkLiveness(videoEl) {
  const frameA = await detect(videoEl)
  await new Promise((r) => setTimeout(r, 400))
  const frameB = await detect(videoEl)

  if (!frameA || !frameB) {
    return { live: false, reason: 'No face detected clearly. Try better lighting.' }
  }

  const movement = averageLandmarkShift(frameA.landmarks, frameB.landmarks)
  const live = movement > 0.4 && movement < 40 // some motion, not a wild jump/no motion at all

  return {
    live,
    reason: live ? null : 'Hold still, keep your face centered, and make sure you\'re a real live camera feed.',
    descriptor: frameB.descriptor,
  }
}

function averageLandmarkShift(a, b) {
  const pointsA = a.positions
  const pointsB = b.positions
  let total = 0
  for (let i = 0; i < pointsA.length; i++) {
    total += pointsA[i].distance(pointsB[i])
  }
  return total / pointsA.length
}

/**
 * Compares the live selfie descriptor against the uploaded profile
 * photo. Lower distance = more similar. ~0.5 or below is a strong
 * match for face-api.js's recognition model.
 */
export async function compareFaces(profileImageEl, liveDescriptor) {
  const profileResult = await detect(profileImageEl)
  if (!profileResult) {
    return { match: false, distance: null, reason: 'No face detected in the profile photo.' }
  }
  const distance = faceapi.euclideanDistance(profileResult.descriptor, liveDescriptor)
  return {
    match: distance < 0.5,
    distance: Number(distance.toFixed(3)),
    reason: distance < 0.5 ? null : 'Selfie doesn\'t clearly match the profile photo.',
  }
}

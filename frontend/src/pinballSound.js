export function playFlipperSound(audio) {
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
}

export function playLifeDownSound(audio) {
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
}

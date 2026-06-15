const root = document.documentElement;
const progressLabel = document.querySelector('#render-progress');
const footerStages = [...document.querySelectorAll('#frame-footer span')];
const hologram = document.querySelector('#hologram-stage');

Array.from({ length: 16 }, (_, index) => {
  const ring = document.createElement('span');
  ring.style.setProperty('--i', index);
  hologram.appendChild(ring);
});

function updateScrollChoreography() {
  const max = root.scrollHeight - window.innerHeight;
  const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  const stage = Math.min(3, Math.floor(progress * 5.2));

  root.style.setProperty('--scroll', progress.toFixed(4));
  progressLabel.textContent = Math.round(progress * 100);
  footerStages.forEach((stageLabel, index) => {
    stageLabel.classList.toggle('active', index <= stage);
  });
}

updateScrollChoreography();
window.addEventListener('scroll', updateScrollChoreography, { passive: true });
window.addEventListener('resize', updateScrollChoreography);

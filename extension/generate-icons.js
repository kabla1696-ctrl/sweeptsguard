// Generate PNG icons for SweepGuard Extension
// Run: node generate-icons.js

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(1, '#8b5cf6');
  
  // Rounded rectangle
  const radius = size * 0.1875;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Shield shape
  const cx = size / 2;
  const cy = size * 0.42;
  const shieldWidth = size * 0.5;
  const shieldHeight = size * 0.45;
  
  ctx.beginPath();
  ctx.moveTo(cx, cy - shieldHeight / 2);
  ctx.lineTo(cx + shieldWidth / 2, cy - shieldHeight / 4);
  ctx.lineTo(cx + shieldWidth / 2, cy + shieldHeight / 4);
  ctx.quadraticCurveTo(cx + shieldWidth / 2, cy + shieldHeight / 2, cx, cy + shieldHeight / 2);
  ctx.quadraticCurveTo(cx - shieldWidth / 2, cy + shieldHeight / 2, cx - shieldWidth / 2, cy + shieldHeight / 4);
  ctx.lineTo(cx - shieldWidth / 2, cy - shieldHeight / 4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();
  
  // Checkmark
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.1, cy);
  ctx.lineTo(cx - size * 0.02, cy + size * 0.08);
  ctx.lineTo(cx + size * 0.12, cy - size * 0.08);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  // Bottom bar
  const barY = size * 0.75;
  const barHeight = size * 0.08;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(size * 0.25, barY, size * 0.5, barHeight);
  
  return canvas.toBuffer('image/png');
}

// Generate icons
sizes.forEach(size => {
  const icon = generateIcon(size);
  const filePath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(filePath, icon);
  console.log(`Generated: icon${size}.png`);
});

console.log('Done! Icons generated in icons/ folder');

 // Simple raw Canvas API based Data Constellation (Knowledge Graph Mockup)
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

let width, height;
const nodes = [];
const numNodes = 120;
let mx = 0, my = 0;
let swarmModeTimer = 0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

window.addEventListener("mousemove", (e) => {
  mx = e.clientX;
  my = e.clientY;
});

class Node {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 2 + 1;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
    
    // Mouse proximity repulsion
    const dx = mx - this.x;
    const dy = my - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 150) {
      this.x -= (dx / dist) * 1.5;
      this.y -= (dy / dist) * 1.5;
    }
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = swarmModeTimer > 0 ? "rgba(255, 0, 60, 0.6)" : "rgba(0, 240, 255, 0.4)";
    ctx.fill();
  }
}

for (let i = 0; i < numNodes; i++) {
  nodes.push(new Node());
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  
  if (swarmModeTimer > 0) {
    swarmModeTimer--;
    if (swarmModeTimer === 0) {
      // return to normal
      nodes.forEach(n => { n.vx *= 0.2; n.vy *= 0.2; });
    }
  }

  const linkColor = swarmModeTimer > 0 ? "rgba(255, 0, 60, " : "rgba(0, 240, 255, ";
  
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].update();
    nodes[i].draw();
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.strokeStyle = `${linkColor}${1 - dist / 120})`;
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(animate);
}
animate();

window.triggerSwarmAnimation = function() {
  swarmModeTimer = 180; // 3 seconds at 60fps
  nodes.forEach(n => {
    n.vx *= 5;
    n.vy *= 5;
  });
};

import "./style.css";

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");

document.querySelector<HTMLDivElement>(
  "#ui"
)!.innerHTML = `<p> Initialize Game </p>`;

class Character {
  constructor(public x: number, public y: number, public width: number, public height: number, public color: string) {}

  draw() {
    ctx!.fillStyle = this.color;
    ctx!.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Initial character's position
const farmer = new Character(gameWidth / 2 - 35, gameHeight / 2 - 35, 70, 70, "yellow");

// Draw character
function drawCharacter() {
  ctx!.clearRect(0, 0, gameWidth, gameHeight);
  farmer.draw();
}

// Arrow key presses
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowLeft":
      farmer.x -= 10;
      break;
    case "ArrowRight":
      farmer.x += 10;
      break;
    case "ArrowUp":
      farmer.y -= 10;
      break;
    case "ArrowDown":
      farmer.y += 10;
      break;
  }
  drawCharacter();
});

drawCharacter();

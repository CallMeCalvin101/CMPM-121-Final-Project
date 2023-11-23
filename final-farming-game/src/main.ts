import "./style.css";

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");

document.querySelector<HTMLDivElement>(
  "#ui"
)!.innerHTML = `<p> Initialize Game </p>`;

ctx!.fillStyle = "green";
ctx!.fillRect(gameHeight / 2 - 75, gameWidth / 2 - 50, 150, 100);

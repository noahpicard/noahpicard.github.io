function loadScript(urls, callback)
{
    // Adding the script tag to the head as suggested before
    var head = document.head;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = urls[0];

    var short = urls.slice(1, urls.length);
    var next = () => loadScript(short, callback);
    if (short.length === 0) {
      next = callback;
    }

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = next;
    script.onload = next;

    // Fire the loading
    head.appendChild(script);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

var state = null;
var ctx = null;
var width = 120;
var height = 100;
var activeTimers = {};

var names = null;
var prompts = null;

function main() {
  init()

  startSyncTimer('draw', draw, 30);
  // startSyncTimer('print', print, 3000);
}

function stopSyncTimer(id) {
  activeTimers[id] = 0;
}

function startSyncTimer(id, callback, delay) {
  activeTimers[id] = delay;
  (function loop(){
    setTimeout(function() {
      if (activeTimers[id] > 0) {
        callback();
        loop();
      }
    }, activeTimers[id]);
  })();
}

function computeNames(name_list) {
  console.log(name_list);
  names.textOptions = name_list.split(/[,|\r\n|\r|\n]+/);
}

function computePrompts(prompt_list) {
  console.log(prompt_list);
  prompts.textOptions = prompt_list.split(/[,|\r\n|\r|\n]+/);
}

function step() {
  state.takeStep();
}

function print() {
  state.print();
}

function drawDot(x, y, pointSize, color) {
  ctx.fillStyle = color; // Red color
  ctx.beginPath(); //Start path
  ctx.arc(x, y, pointSize, 0, Math.PI * 2, true); // Draw a point using the arc function of the canvas with a point structure.
  ctx.fill(); // Close the path and fill.
}

function drawText(x, y, text, color) {
  ctx.fillStyle = color;
  ctx.font = '48px serif';
  ctx.fillText(text, x, y);
}

function draw() {
  ctx.clearRect(0, 0, width * 10, height * 10);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width * 10, height * 10);
  state.objects.map((obj) => {
    drawText(obj.x * 10, obj.y * 10, obj.text, obj.color);
  })
}

function init() {
  var s = new TimedSounder();
  s.init(1, 3, 10, 1200, "bell.mp3");
  state.objects.push(s);

  names = new TimedTexter();
  names.init(1, 3, 10, 1200, ["Noah", "Michaela", "Theo"],  "white");
  state.objects.push(names);

  prompts = new TimedTexter();
  prompts.init(2, 3, 20, 1200, [
    "If I were more honest right now...",
    "I'm currently experiencing...",
    "I'm feeling curious about...",
    "If I were more honest right now...",
    "I'm currently experiencing...",
    "I'm feeling curious about...",
    "If I were more honest right now...",
    "I'm currently experiencing...",
    "I'm feeling curious about...",
    "If I were more honest right now...",
    "I'm currently experiencing...",
    "I'm feeling curious about...",
    "If you really knew me you'd know...",
    "Something I'm imagining about you is...",
    "Something I'm imagining about you is...",
    "A story I have about you is...",
    "Something I'm connecting with you on is...",
    "A secret I have is...",
    "Something that feels vulnerable to share is...",
    "Something I would share if I were uninhibited is...",
    "My authentic reaction to what has been shared is...",
  ], "lime");
  state.objects.push(prompts);

  var c = new Counter();
  c.init(2, 3, 30, 10, 120, "red");
  //state.objects.push(c);
}

var onLoad = function() {
  state = new State();
  window.onload = (event) => {
    var canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    main();
  }
};

loadScript(["js/objects.js", "js/state.js"], onLoad);







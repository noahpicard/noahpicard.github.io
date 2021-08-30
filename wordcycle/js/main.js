var width = 992; // In pixels
var height= 688; // In pixels
var activeTimers= {};

var phrases1 = [
  "Reality is what interrupts the wine party",
"",
"the lingering kiss shattered by a car honk",
"in this it only exists as a vacuum—",
"instantly re-filled by fantasy but pulling",
"tugging on the fabric from what can be",
"",
"We twist in highschool knots",
"under the light of Pizza Hut— I pet",
"your hair & the passenger chair shrinks",
"your hips to mine. An angry two knocks",
"against the car window— I jolt, 24",
"",
"Sartre describes a period in painting",
"between the painter as illustrator & the",
"painter as visionary— he marks this period",
"as one of the commodified, wandering",
"painter, lined up in Venice stalls for hire",
"like the overripe tomatoes bundling in",
"twine carriages—",
"",
"we tether to a perceived safety— the",
"way it was always done becomes a",
"valid and contemporary argument",
"",
"You take me around to the bleachers",
"the tree where you lunched like dogs",
"We drive to the mall to get your favorite",
"pretzels & then to the fountain",
"downtown block to eat a caramel apple",
"",
"As Tintoretto produces Italian figures",
"a machination turns, an orbit of",
"painters replicating his motions with",
"the man a woman, the bowl of pears",
"now to the left of his/her hip, the curtains",
"in a deeper red",
"",
"They will build until they take the price",
"of painting to base oils",
"",
"We hike to the top of the field, wait until",
"the bench is vacated and read the sunset",
"to rest— your head rolls on my thigh",
"& then it is dark",
];

var phrases2 = [
"their boots",
"",
"scraped across the porcelain and",
"the bathroom descended bright and static",
"I took your hair and we sat by the tub",
"in silence",
"",
"the door always scraped off its hinges",
"afternoon sun— I don’t know why",
"",
"we didn’t fuck more: my libido would return in force",
"a month after we parted",
"",
"but you put mirrors everywhere— stretching gold framed",
"collected from rooms within rooms",
"I remember your red lipstick matched",
"your dress and the bright wine that splattered",
"",
"I cannot believe how easy it was to convince myself",
"that this was enough",
"",
"that the concrete-lined pool was warm in winter",
"that my toes blued naturally",
"that I didn’t wish your roommate had visited",
"",
"so I didn’t have to lyft at midnight",
"a lamppost shone like the moon over snow",
"I watched you descend the staircase",
"",
"I remember crawling carefully into ",
"my mouth",
"",
"as you proclaimed to the crowded room",
"about this malleable truth",
"about much-needed transgressions",
"",
"a group of us, we set a boat on fire",
"laughed as it descended from the pier",
"and I realized I had forgotten how ",
"dark the sky used to be",
];

var phrases3 = [
"cope",
"",
"I could rip this page over to",
"write upside-down I could spell",
"every word backwards in yellow",
"chalk atop the banister so only",
"to be read in reflection I could ",
"use too many metaphors, like",
"the poet in the newspaper who",
"used four metaphors in as ",
"many lines she wanted to make ",
"it very clear she and her lesbian",
"ex-lover were not over despite",
"obvious emotional misalign-",
"ments I could compress this",
"line for line and chop it close",
"to unreadable but it still reads",
"long: that I’m petrified your prior",
"rejections will continue to over-",
"ride how soft I feel in your arms",
"and build a urge in my chest",
"to run and that I will reason that",
"it is because of some incomp-",
"atibility rather than my own hurt",
"or fear to step too close to you",
];

var phrases = [
"Undoubtedly",
"",
"She left in the morning",
"That 3am: she shot straight up,",
"silent- and when I grabbed her, ",
"she registered back onto me",
"",
"That evening: discussing brains,",
"and their relation to headaches-",
"the dura shrinks in dehydration",
"pulls away from the skull,",
"tear-ifying various nerve ends",
"",
"the innards of an orange ",
"collapsing inward from its rind",
"",
"That morning: little spacker birds",
"picking at the dry matted grass;",
"the smiling man rode up the hill",
"again, today-- wonderful rustling.",
];


var baseXOffset = 100;
var baseYOffset = 100;
var xOffset = 50;
var yOffset = 50;

var words_list = phrases.map((phrase) => phrase.toUpperCase().split(" "));

var letterIndex = 0;

function getLetterIndexes(letterIndex) {
  return words_list.map((words) => words.map((word) => letterIndex % (word.length + 1)));
}

function getLetters(letterIndex) {
  return words_list.map((words) => words.map((word) => (word + " ")[letterIndex % (word.length + 1)]));
}

function main() {
  init();

  startSyncTimer('draw', () => { draw() }, 30);
  startSyncTimer('step', () => { step() }, 1000);
  // startSyncTimer('print', print, 3000);
  document.addEventListener('keydown', function(event) {
  });

  document.addEventListener('keypress', function(event) {
  });

  document.addEventListener('keyup', function(event) {
  });
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

function step() {
  letterIndex += 1;
}

function print() {
  //
}

function draw() {
  var canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');

  var letters = getLetters(letterIndex);
  var letterIndexes = getLetterIndexes(letterIndex);
  var display = letters.join(' ');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var j = 0; j < letters.length; j+=1) {
    for (var i = 0; i < letters[j].length; i+=1) {
      var x = baseXOffset + i * xOffset;
      var y = baseYOffset + j * yOffset;
      ctx.font = '48px Courier New';
      ctx.fillStyle = 'black';
      if (letterIndexes[j][i] == 0) {
        ctx.fillStyle = 'purple';
      }
      ctx.fillText(letters[j][i], x, y);  
    }
  }
  
}

function init() {

}

window.onload = (event) => {
  console.log('loaded!');
  // SETUP
  main();
}

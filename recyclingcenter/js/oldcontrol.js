$(document).ready(function() {
	var block = $('#header');
	block.css('background-color', getRandomColor());
	block.css('color', 'white');
	tools.currList = getShuffled(tools.titleList);
	setInterval(changeBlockColor, 7000);
	setTimeout(function() {
		setInterval(changeHeaderTitle, 7000);
	}, 500);
});

function changeHeaderTitle() {
	var title = $('#headerTitle');
	var startStr = 'Let\'s ';
	var endStr = '.';
	tools.titleIndex++;
	if (tools.titleIndex >= tools.currList.length) {
		tools.currList = getShuffled(tools.titleList);
		tools.titleIndex = 0;
	}
	var midStr = tools.currList[tools.titleIndex];
	title.text(startStr + midStr + endStr);
}

function getShuffled(list) {
	var list2 = [];
	for(i = 0; i < list.length; i++) {
		list2.push(list[i]);
	}

	var m = list2.length;
	for (i = 0; i < m; i++) {
		var n = i + randomRange(0, m - i);
		var temp = list2[i];
		list2[i] = list2[n];
		list2[n] = temp;
	}
	return list2;
}

tools = {};

tools.titleIndex = 0;
tools.currList = [];

tools.titleList = [
'create something beautiful',
'build something inspiring',
'make something unique',
'create a game to teach graphing',
'create a game to learn about vectors',
'build an app to share your stuff',
'build an app to teach martial arts',
'build an app to learn to dance',
'create a web puzzle game for a team',
'design new ways to share your stuff',
'make opportunities to see the world',
'build cheap solar water purifiers',
'statistically map satellite data',
'code a stunning website',
'develop new mathematical proofs',
'make procedurally generated music',
'build decentralized security systems',
'create data-driven fashion',
'build location based artist promotion',
'make an ecofriendly teacher app',
'craft a real life cooking game',
'track diseases through facebook',
'create a website to spread happiness',
'create neural network fraud detection',
'create animal based topographic mapping',
'develop a climate action game',
'visually map academic subjects',
'craft an intuitive visual language'
];

function changeBlockColor() {
	var block = $('#header');
	block.css('background-color', getRandomColor());
}

function randomRange(low, high) {
	return Math.floor(Math.random() * (high-low)) + low;
}

function getRandomColor() {
	var color = randomRange(0, 360);
	var colorStr = 'hsl(' + color + ',50%,50%)';
	return colorStr;
}



function clickActive(div) {
	if (div.test) {
		div.test = false;
		collapseInfo(div);
	} else {
		div.test = true;
		expandInfo(div);
	}
}
function expandInfo(div) {
	var paragraph = div.getElementsByTagName("p")[0];

      div = $(div);
      paragraph = $(paragraph);

      var parheight = paragraph.height();
      parheight=+parheight;
      div.height(115+parheight+26+'px');   

	paragraph.fadeTo(1,1.0);
	
}
function collapseInfo(div) {
	if (div.test) {
		return;
	}
	var paragraph = div.getElementsByTagName("p")[0];
	div = $(div);
    paragraph = $(paragraph);
    
	var divheight = div.height();
    divheight=+divheight;

	div.height("115px");
	paragraph.fadeTo(1, 0.0);
}

/*


*/

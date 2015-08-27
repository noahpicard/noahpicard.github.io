$(document).ready(function() {
	var block = $('#header');
	block.css('background-color', getRandomColor());
	block.css('color', 'white');
	setInterval(changeBlockColor, 7000);
	setTimeout(function() {
		setInterval(changeHeaderTitle, 7000);
	}, 500);
});

function changeHeaderTitle() {
	var title = $('#headerTitle');
	var startStr = 'Let\'s create ';
	var endStr = '.';
	var midStr = tools.titleList[randomRange(0, tools.titleList.length)];
	title.text(startStr + midStr + endStr);
}


tools = {};

tools.titleList = [
'something beautiful',
'something inspiring',
'something unique',
'a game to teach graphing',
'a game to learn about vectors',
'an app to share your stuff',
'an app to teach martial arts',
'an app to learn to dance',
'a web puzzle game for a team',
'new ways to share your stuff',
'opportunities to see the world',
'cheap solar water purifiers',
'mappings for satellite data',
'a stunning website',
'new mathematical proofs',
'data-driven fashion',
'procedurally generated music',
'location based artist promotion',
'an ecofriendly teacher app',
'a real life cooking game',
'disease tracking through facebook',
'a website to spread happiness',
'neural network fraud detection',
'animal based topographic mapping',
'a climate action game',
'mappings of knowledge',
'decentralized security systems'
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
	//div = h2.parentNode;
	var paragraph = div.getElementsByTagName("p")[0];
	//height=height.replace("px","");
      //height=+height;
      //change height
      
      div = $(div);
      paragraph = $(paragraph);

      var parheight = paragraph.height();
      parheight=+parheight;
      div.height(115+parheight+26+'px');   
	//div.style.height = div.style.height + paragraph.style.height;
	paragraph.fadeTo(1,1.0);
	
	//paragraph.style.height = +parheight+'px';
}
function collapseInfo(div) {
	if (div.test) {
		return;
	}
	//div = h2.parentNode;
	var paragraph = div.getElementsByTagName("p")[0];
	div = $(div);
    paragraph = $(paragraph);
    
	var divheight = div.height();
    divheight=+divheight;

	//paragraph.style.height = "0px";
	div.height("115px");
	paragraph.fadeTo(1, 0.0);
}

/*


*/

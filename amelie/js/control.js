var imageFolder = "../images/";

var content = []

var embedVideoStart = '<iframe class="video" src="https://www.youtube.com/embed/'
var embedVideoEnd = '" frameborder="0" allowfullscreen></iframe>';

var videoList = [
	"Lu4PHVDk9wA",
	"Z291bN05kJ8",
	"BtQk_KW7JPU",
	"BlFA9_Q3SKs",
	"eYCDBrgYWcg",
	"JbeGc4K5McM",
	"NmZEZHOVz3Q",
	"6NLKFVzVMwY",
	"Z4Fv_pW9-Ac"
];

var getImages = function() {
	$.ajax({
	    url: imageFolder,
	    success: resultImages
	});
}

var getVideos = function() {
	var temp = [];
	for (i in videoList) {
		var videoId = videoList[i];
		temp.push(["video", videoId]);
	}
	scatterIntoContent(temp);
	getPoems();
}

var getPoems = function() {
	var temp = [];
	for (i in poems) {
		var poem = poems[i];
		temp.push(["poem", poem]);
	}
	scatterIntoContent(temp);
	renderContent(content);
}

var resultImages = function(data) {
	$(data).find("a").attr("href", function (i, val) {
        if( val.match(/\.(jpe?g|png|gif)$/) ) { 
        	content.push(["image", val]);
        } 
    });
    getVideos();
}

var scatterIntoContent = function(temp) {
	var len = temp.length;
    console.log(temp);
	var step = Math.floor(content.length / len);
	console.log(step);
	for (i in temp) {
		var idx = (step + 1) * i;
		console.log(idx);
		content.splice(idx, 0, temp[i]);
	}
}

var renderContent = function(content) {
	for (i in content) {
		var item = content[i];
		var type = item[0];
		var val = item[1]; 
		var child = "";
		if (type == "image") {
			child = "<div class=\"child image-child\"><img class=\"image\" src='"+ imageFolder + val +"'></div>";
		} else if (type == "video") {
			child = "<div class=\"child video-child\">" + embedVideoStart + val + embedVideoEnd + "</div>";
		} else if (type == "poem") {
			child = "<div class=\"child poem-child\"><div class=\"poem-box\"><p class=\"poem\">" + val + "</p></div></div>";
		}

		$(".image-flow").append(child);
	}
}

$( document ).ready(function() {
    getImages();
});


var intro = `
Hallo Love! You made it!<br/>
This is my present to you. I was thinking about you,<br/>
and how happy you make me feel, and how lucky I am <br/>
to go on adventures with you, and I was inspired to <br/>
put together a collection of our memories- a virtual<br/>
scrapbook, if you will. So I've 'curated' a set of<br/>
photos, videos, and writings that have marked our<br/>
time spent together thus far. And I built this site!<br/>
<br/>
I hope you enjoy poking around, and I hope that we <br/>
fill this with many more adventures to come!<br/>
<br/>
Love,<br/>
Noah <i class="fa fa-heart text-heart center"></i><br/>
`

var poem1 = `
Freckles- she’s covered (in the<br/>
lightest freckles) they dapple and<br/> 
trace the circumference of curled<br/>
<br/>
maps. She dusts them <br/>
over most days: lips pursed,<br/>
obscuring ellipses, capitols,<br/>
<br/>
deltas; I (bare, elbowed on the<br/>
sheet) watch her reflection<br/>
erase her story- but moonlight catches <br/>
it- and light off water<br/>
<br/>
and when <br/>
she angers the trail flares, splashes <br/>
her face so my eyes cannot wander<br/>
`;

var poem2 = `
I break the sheet<br/>
In Vancouver the trains run on the sky<br/>
that periwinkle white, such a summary<br/>
of skyscraper, of river ferry<br/>
flat on the water, of evenings reflected<br/>
in eyes (hers, not mine)<br/>
it swirls like a fog-drain<br/>
upon our hilltop<br/>
and I fold my palms on the sheet<br/>
to crack and splinter<br/>
salt along lips<br/>
trespassers<br/>
crystalline pages that splinter<br/>
In Vancouver all light is reflected<br/>
I sprawl like marionette<br/>
loosened by the odd tugs of salt and truffle<br/>
`;

var poem3 = `
One three-inch sparrow<br/>
Turns his head all around<br/>
Two feet from me<br/>
He hops like a rubber ball<br/>
Another three-inch sparrow joins<br/>
And they play checkers bodily<br/>
<br/>
Some rugged pigeon struts<br/>
her stuff all over the grille<br/>
marble eyes steady as pinpoints<br/>
grab- bobob - bob grab bob bob<br/>
<br/>
The three-inch sparrow<br/>
he’s all flutter and fluster-<br/>
little jet plane aviator<br/>
he tucks up his wings<br/>
and beams over to Thursday<br/>
<br/>
Back- his head crooked<br/>
The chair slats rumble on back of my hand<br/>
As he hip hops<br/>
<br/>
The way he trips into flight<br/>
Past my nose (I could sniff him outta the air)<br/>
To him we must be a landscape<br/>
Something (immobile) to be barreled through<br/>
`;

var poems = [intro, poem1, poem2, poem3];




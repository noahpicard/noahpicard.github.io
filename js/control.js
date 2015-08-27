$(document).ready(function() {
	var block = $('#header');
	var color = Math.floor(Math.random() * 360);
	var colorStr = 'hsl(' + color + ',50%,50%)';
	block.css('background-color', colorStr);
	block.css('color', 'white');

});



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

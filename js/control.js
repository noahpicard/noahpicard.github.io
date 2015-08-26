function clickActive(div) {
	if (div.test) {
		collapseInfo(div);
	} else {
		expandInfo(div);
	}
}
function expandInfo(div) {
	div.test = true;
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
	div.test = false;
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

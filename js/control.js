function clickActive(div) {
	alert('bruh');
	var paragraph = div.getElementsByTagName("p")[0];
	if (div.test) {
		collapseInfo(div);
	} else {
		expandInfo(div);
	}
}
function expandInfo(div) {
	//div = h2.parentNode;
	var paragraph = div.getElementsByTagName("p")[0];
	//height=height.replace("px","");
      //height=+height;

      //change height

      var divheight = div.style.h.replace("px","");
      divheight=+divheight;
      var parheight = paragraph.style.h.replace("px","");
      parheight=+parheight;
      div.style.height = divheight+parheight+26+'px';   
	//div.style.height = div.style.height + paragraph.style.height;
	paragraph.style.opacity = "1.0";
	div.test = true;
	//paragraph.style.height = +parheight+'px';
}
function collapseInfo(div) {
	//div = h2.parentNode;
	var paragraph = div.getElementsByTagName("p")[0];
	var divheight = div.style.height.replace("px","");
    divheight=+divheight;
	//paragraph.style.height = "0px";
	div.style.height = "115px";
	paragraph.style.opacity = "0.0";
	div.test = false
	
}
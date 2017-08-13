$(document).ready(function() {
 	$('.imageFrame').css('min-height', $(window).height()+"px");
 	$(".seeMore").click(function(caller) {
 		console.log(caller);
     	var current = caller.currentTarget;
     	var expand = $(current.parentNode).children('.expand');
     	if (expand.css('max-height') == '0px') {
     		var totalHeight = 20;
     		expand.children().each(function(){
     			totalHeight = totalHeight + $(this).outerHeight(true);
 			});
     		expand.css('max-height',totalHeight+'px');
     		$(current).text('Hide Courses');
     	} else {
     		expand.css('max-height','0px');
     		$(current).text('See Courses');
     	}
     	
 	});
 });
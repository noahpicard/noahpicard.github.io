$(document).ready(function() {
    renderPath();

    $('.name-answer').change(function(event) {
      var name = event.target.value;
      if (name === '') {
        $('.name').text('');
      } else {
        $('.name').text(', ' + name);
      }
    })

    $('div.f').html(function(index, oldHtml) {
      return '<span>' + oldHtml + '</span>';
    });

    $('.startups-section-sender').on('click', function() {
      scrollToCenter('.startups-section-anchor', true);
    });
    $('.poetry-section-sender').on('click', function() {
      scrollToCenter('.poetry-section-anchor', true);
    });
    $('.dla-section-sender').on('click', function() { 
      scrollToCenter('.dla-section-anchor', true);
    });
    $('.extra-section-sender').on('click', function() { 
      scrollToCenter('.extra-section-anchor', false);
    });
    $('.contact-section-sender').on('click', function() { 
      scrollToCenter('.contact-section-anchor', false);
    });
    $('.contact-section-sender2').on('click', function() { 
      scrollToCenter('.contact-section-anchor', true);
    });

    $('.startups-section-anchor').on('click', function() {
      scrollToCenter('.projects-section-anchor', false);
    });
    $('.poetry-section-anchor').on('click', function() {
      scrollToCenter('.poetry-section-anchor2', false);
    });
    $('.poetry-section-anchor2').on('click', function() {
      scrollToCenter('.projects-section-anchor', false);
    });
    $('.dla-section-anchor').on('click', function() { 
      scrollToCenter('.projects-section-anchor', false);
    });
    $('.contact-section-anchor').on('click', function() { 
      scrollToCenter('.title-section-anchor', true);
    });


    $('.title-section-anchor').on('click', function() {
      scrollToCenter('.intro-section-anchor', false);
    });
    $('.intro-section-anchor').on('click', function() {
      scrollToCenter('.projects-section-anchor', false);
    });
    $('.projects-section-anchor').on('click', function() {
      scrollToCenter('.extra-section-anchor', false);
    });
    $('.extra-section-anchor').on('click', function() {
      scrollToCenter('.collaborate-section-anchor', false);
    });
    $('.collaborate-section-anchor').on('click', function() {
      scrollToCenter('.resume-section-anchor', false);
    });
    $('.resume-section-anchor').on('click', function() {
      scrollToCenter('.explore-section-anchor', false);
    });
    $('.explore-section-anchor').on('click', function() {
      scrollToCenter('.contact-section-anchor', true);
    });
  
});


var scrollToCenter = function(selector, forward) {
  var windowWidth = $(window).width() // || (window.innerWidth > 0) ? window.innerWidth : screen.width;
  var windowHeight = $(window).height() //(window.innerHeight > 0) ? window.innerHeight : screen.height;
  var v = {
    width        : $(window).width(),
    height       : $(window).height(),
    screen_width : screen.width,
    screen_height: screen.height
  }
  console.log(windowWidth);
  console.log(windowHeight);
  console.log(v);

  var element = $(selector);
  var hTime = windowWidth;
  var vTime = windowHeight;
  if (forward) {
    $('html, body')
      .animate({ 
        scrollLeft: element.offset().left - (windowWidth / 2),
      }, hTime)
      .delay(0)
      .animate({ 
        scrollTop: element.offset().top - (windowHeight / 2),
      }, vTime);
  } else {
    $('html, body')
      .animate({ 
        scrollTop: element.offset().top - (windowHeight / 2),
      }, vTime)
      .delay(0)
      .animate({ 
        scrollLeft: element.offset().left - (windowWidth / 2),
      }, hTime);
  }
}


var lineStruct = [
	// Intro
	//{x:26.5, y:29.5, dir:0, len:8, ypage:0},
	{x:34.5, y:19.5, dir:3, len:58.5, ypage:0},

	// Page 1
	{x:34.5, y:18, dir:0, len:37, ypage:1},
	{x:71.5, y:18, dir:3, len:24, ypage:1},
	{x:27.5, y:42, dir:0, len:44, ypage:1},
	{x:27.5, y:18, dir:3, len:24, ypage:1},
	{x:27.5, y:18, dir:0, len:1, ypage:1},
	{x:28.5, y:18, dir:3, len:42, ypage:1},

	// Page 2
	{x:28.5, y:0, dir:3, len:24, ypage:2},
	{x:27.5, y:24, dir:0, len:1, ypage:2},
	{x:27.5, y:18, dir:3, len:6, ypage:2},
	{x:27.5, y:18, dir:0, len:22, ypage:2},
	{x:49.5, y:18, dir:3, len:33, ypage:2},

	{x:49.5, y:24, dir:0, len:23, ypage:2},
	{x:49.5, y:33, dir:0, len:23, ypage:2},
	{x:49.5, y:42, dir:0, len:44.5, ypage:2},
	{x:49.5, y:51, dir:0, len:23, ypage:2},

	// 1
	{x:72.5, y:21, dir:3, len:3, ypage:2},
	{x:72.5, y:21, dir:0, len:10.5, ypage:2},
	{x:83, y:18, dir:3, len:3, ypage:2},
	{x:83, y:18, dir:0, len:23, ypage:2},

  {x:106, y:18, dir:3, len:60, ypage:1},
  {x:106, y:18, dir:0, len:43.5, ypage:1},

	// 2
	{x:72.5, y:33, dir:3, len:3, ypage:2},
	{x:72.5, y:36, dir:0, len:10.5, ypage:2},
	{x:83, y:30, dir:3, len:6, ypage:2},
	{x:83, y:30, dir:0, len:11, ypage:2},
	{x:94, y:30, dir:3, len:3, ypage:2},
	{x:94, y:33, dir:0, len:56, ypage:2},

  {x:150.5, y:33, dir:0, len:10.5, ypage:2},
  {x:161, y:15, dir:3, len:18, ypage:2},
  {x:161, y:15, dir:0, len:33, ypage:2},

	// 3
	{x:94, y:42, dir:3, len:3, ypage:2},
	{x:83, y:45, dir:0, len:11, ypage:2},
	{x:83, y:45, dir:3, len:3, ypage:2},
	{x:83, y:48, dir:0, len:34, ypage:2},

  {x:117, y:48, dir:3, len:30, ypage:2},
  {x:117, y:18, dir:0, len:32.5, ypage:3},
 	
 	// 4
	{x:72.5, y:51, dir:3, len:6, ypage:2},
	{x:71.5, y:57, dir:0, len:1, ypage:2},
	{x:71.5, y:57, dir:3, len:3, ypage:2},

	// Page 3
	{x:71.5, y:0, dir:3, len:60, ypage:3},

	{x:17, y:24, dir:0, len:33.5, ypage:3},
	{x:17, y:24, dir:3, len:18, ypage:3},
	{x:17, y:42, dir:0, len:33.5, ypage:3},
	{x:50.5, y:24, dir:3, len:18, ypage:3},

	{x:27.5, y:42, dir:3, len:9, ypage:3},
	{x:27.5, y:51, dir:0, len:33.5, ypage:3},
	{x:61, y:51, dir:3, len:6, ypage:3},
	{x:61, y:57, dir:0, len:10.5, ypage:3},

	// Page 4
	{x:71.5, y:0, dir:3, len:18, ypage:4},
	{x:27.5, y:18, dir:0, len:44, ypage:4},
	{x:27.5, y:18, dir:3, len:24, ypage:4},
	{x:27.5, y:42, dir:0, len:11.5, ypage:4},
	{x:39, y:42, dir:3, len:18, ypage:4},

	// Page 5
	{x:39, y:0, dir:3, len:24, ypage:5},
	{x:39, y:24, dir:0, len:55, ypage:5},
	{x:83, y:24, dir:3, len:36, ypage:5},

	// Page 6
	{x:83, y:0, dir:3, len:27, ypage:6},
  {x:72.5, y:27, dir:0, len:10.5, ypage:6},
  {x:72.5, y:15, dir:3, len:12, ypage:6},
  {x:49.5, y:15, dir:0, len:23, ypage:6},
  {x:49.5, y:15, dir:3, len:15, ypage:6},
  {x:49.5, y:30, dir:0, len:22, ypage:6},
  {x:71.5, y:18, dir:3, len:12, ypage:6},
  {x:27.5, y:18, dir:0, len:44, ypage:6},
  {x:27.5, y:12, dir:3, len:6, ypage:6},
  {x:5, y:12, dir:0, len:22.5, ypage:6},
  {x:5, y:12, dir:3, len:9, ypage:6},
  {x:5, y:21, dir:0, len:22.5, ypage:6},
  {x:27.5, y:21, dir:3, len:12, ypage:6},
  {x:5, y:33, dir:0, len:22.5, ypage:6},
  {x:5, y:33, dir:3, len:12, ypage:6},
  {x:5, y:45, dir:0, len:22.5, ypage:6},
  {x:27.5, y:39, dir:3, len:6, ypage:6},
  {x:27.5, y:39, dir:0, len:44, ypage:6},
  {x:71.5, y:39, dir:3, len:12, ypage:6},
  {x:28.5, y:51, dir:0, len:43, ypage:6},
  {x:28.5, y:33, dir:3, len:18, ypage:6},
  {x:28.5, y:33, dir:0, len:71.5, ypage:6},

  {x:100, y:33, dir:0, len:27.5, ypage:6},
  {x:127.5, y:18, dir:3, len:15, ypage:6},
  {x:127.5, y:18, dir:0, len:23, ypage:6},



];

var circleStruct = [
  {x:34, y:19, ypage:0, class:'title-section-anchor'},
  {x:28, y:29.5, ypage:1, class:'intro-section-anchor'},
  {x:49, y:29.5, ypage:2, class:'projects-section-anchor'},
  {x:50, y:29.5, ypage:3, class:'extra-section-anchor'},
  {x:27, y:29.5, ypage:4, class:'collaborate-section-anchor'},
  {x:82.5, y:29.5, ypage:5, class:'resume-section-anchor'},
  {x:27, y:29.5, ypage:6, class:'explore-section-anchor'},

  {x:194, y:14.5, ypage:2, class:'poetry-section-anchor2'},
  {x:94, y:23.5, ypage:5},

  {x:149.5, y:17.5, ypage:1, class:'startups-section-anchor'},
  {x:149.5, y:32.5, ypage:2, class:'poetry-section-anchor'},
  {x:149.5, y:17.5, ypage:3, class:'dla-section-anchor'},
  {x:149.5, y:17.5, ypage:6, class:'contact-section-anchor'},
]

var cssStruct = {
  'svg.mainView': {
    width: 200,
    height: 420,
  }, 

  'div.title': {
    left: 6,
    top: 52,
  },

  'div.subtitle': {
    left: 6,
    top: 41.666,
  },

  'div.smi': {
    left: 6,
    top: 90,
  },

  'div.img-intro': {
    left: 39,
    bottom: 90,
    width: 55,
  },

  'div.img-profile': {
    left: -5,
    // top: 115,
    middle: 150,
    width: 30,
  },

  'div.greeting': {
    left: 39,
    top: 140,
    width: 31.5,
  },

  'div.greeting-response': {
    left: 29.5,
    top: 195,
    width: 31.5,
  },

  'div.projects-intro': {
    left: 29.5,
    top: 220.5,
    width: 31.5,
  },

  'div.projects-section': {
    left: 50.5,
    width: 48.5,
  },

  'div.projects-section-startups': {
    top: 235,
    width: 25.5,
  },

  'div.projects-section-poetry': {
    top: 250,
    width: 36.5,
  },

  'div.projects-section-dla': {
    top: 265,
  },

  'div.projects-section-other': {
    top: 280,
  },

  'div.box-section': {
    left: 28.5,
    top: 345,
    width: 21,
  },

  'div.extra-section': {
    left: 72.5,
    width: 21,
  },

  'div.extra-section-photography': {
    top: 330,
  },

  'div.extra-section-dance': {
    top: 340,
  },

  'div.extra-section-music': {
    top: 350,
  },

  'div.extra-section-blog': {
    top: 360,
  },

  'div.invite': {
    left: 39,
    top: 440,
    width: 60.5,
  },

  'div.resume-intro': {
    left: 50.5,
    top: 535,
    width: 43.5,
  },

  'div.extra-intro': {
    left: 84,
    top: 570,
    width: 10,
  },

  'div.startups-section-intro': {
    left: 117,
    top: 125,
    width: 31.5,
  },

  'div.startups-column': {
    top: 140,
    width: 21.6,
  },

  'div.startups-column-1': {
    left: 117,
  },

  'div.startups-column-2': {
    left: 139.5,
  },

  'div.poetry-section-intro': {
    left: 127,
    top: 247.5,
    width: 27.5,
  },

  'div.dla-section-intro': {
    left: 128.5,
    top: 325,
    width: 27.5,
  },

  'div.dla-column': {
    top: 340,
    width: 10.5,
  },

  'div.dla-column-1': {
    left: 128.5,
  },

  'div.dla-column-2': {
    left: 140,
  },

  'div.dla-column-3': {
    left: 151.5,
  },

  'div.dla-column-4': {
    left: 163,
  },

  '#TumblrRecentPosts': {
    left: 168.5,
    top: 235,
    width: 27.5, 
  },

  'div.tumblr': {
    width: 27.5,
  },

  'div.explore-section-1': {
    left: 50.5,
    top: 620,
    width: 21,
  },

  'div.explore-section-2': {
    left: 28.5,
    top: 625,
    width: 21,
  },

  'div.explore-section-3': {
    left: 6,
    top: 630,
    width: 21,
  },

  'div.explore-section-4': {
    left: 50.5,
    top: 645,
    width: 21,
  },

  'div.explore-section-5': {
    left: 28.5,
    top: 650,
    width: 21,
  },

  'div.explore-section-6': {
    left: 6,
    top: 650,
    width: 21,
  },

  'div.explore-section-7': {
    left: 50.5,
    top: 660,
    width: 21,
  },

  'div.explore-section-8': {
    left: 50.5,
    top: 680,
    width: 21,
  },

  'div.explore-section-9': {
    left: 6,
    top: 670,
    width: 21,
  },

  'div.contact-section-direct': {
    left: 83,
    top: 650,
    width: 17,
  },

  'div.contact-section': {
    left: 139,
    top: 640,
    width: 60.5,
  }
}

var dirs = [
	{x:1, y:0},
	{x:0, y:-1},
	{x:-1, y:0},
	{x:0, y:1}
];

var getYDir = function(y, dir, len) {
	var factor = dirs[dir].y
	return y + (factor * len)
}

var getXDir = function(x, dir, len) {
	var factor = dirs[dir].x
	return x + (factor * len)
}

var transformX = function(x, offset=0.0) {
  var windowWidth = $(window).width()// (window.innerWidth > 0) ? window.innerWidth : screen.width;
  var w = windowWidth;

	return (((x/100.0*100) * (w/100)) + offset)
}

var transformY = function(y, ypage=0.0, offset=0.0) {
	return ((((y/60.0*100) + (ypage*100)) * 8) + offset)
}

var px = function(num) {
  return num + 'px'
}

var applyCSS = function() {

  for (key in cssStruct) {
    style = cssStruct[key];
    var element = d3.selectAll(key);
    if (!element.node()) {
      continue;
    }
    
    var bounds = element.node().getBoundingClientRect();
    var ratio = bounds.height/bounds.width;
    console.log(key, ratio, bounds.height, bounds.width);
    
    objStyle = {};
    objStyle['width'] = bounds.width;
    if ('width' in style) {
      objStyle['width'] = transformX(style.width);
    }
    if ('height' in style) {
      objStyle['height'] = px(transformY(style.height));
    }
    if ('left' in style) {
      objStyle['left'] = px(transformX(style.left, 0));
    }
    if ('right' in style) {
      objStyle['left'] = px(transformX(style.left, -objStyle['width']));
    }
    if ('center' in style) {
      objStyle['left'] = px(transformX(style.center, -objStyle['width']/2));
    }
    if ('top' in style) {
      objStyle['top'] = px(transformY(style.top/100.0*60.0, 0, 0));
    }
    if ('bottom' in style) {
      objStyle['top'] = px(transformY(style.bottom/100.0*60.0, 0, -ratio*objStyle['width']));
    }
    if ('middle' in style) {
      objStyle['top'] = px(transformY(style.middle/100.0*60.0, 0, -ratio*objStyle['width']/2));
    }
    objStyle['width'] = px(objStyle['width']);

    if (key == 'div.img-profile') {
      console.log(objStyle);
    }
    d3.selectAll(key)
      .style(objStyle);
  }
}

var renderPath = function() {
	//Create SVG element and append map to the SVG
    var svg = d3.select('body')
        .append("svg")
        .attr("class", "mainView");


    // filters go in defs element
    var defs = svg.append("defs");

    // create filter with id #drop-shadow
    // height=130% so that the shadow is not clipped
    var filter = defs.append("filter")
        .attr("id", "dropshadow")
        .attr("height", "200%")
        .attr("width", "200%");

    // SourceAlpha refers to opacity of graphic that this filter will be applied to
    // convolve that with a Gaussian with standard deviation 3 and store result
    // in blur
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 3);

    // translate output of Gaussian blur to the right and downwards with 2px
    // store result in offsetBlur
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 2)
        .attr("dy", 2)
        .attr("result", "offsetblur");

    var feComponentTransfer = filter.append("feComponentTransfer");
 
    feComponentTransfer.append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 0.5);


    // overlay original SourceGraphic over translated blurred opacity by using
    // feMerge filter. Order of specifying inputs is important!
    var feMerge = filter.append("feMerge");

    feMerge.append("feMergeNode");
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");


    svg.selectAll(".path")
        .data(lineStruct)
        .enter()
        .append('line')
        .attr({
            "class": function(d) { 
                return 'path'
            },
            "x1": function(d) { 
                return px(transformX(d.x))
            },
            "y1": function(d) { 
                return px(transformY(d.y, d.ypage))
            },
            "x2": function(d) { 
                return px(transformX(getXDir(d.x, d.dir, d.len)))
            },
            "y2": function(d) { 
                return px(transformY(getYDir(d.y, d.dir, d.len), d.ypage))
            }
        });

    var circles = svg.selectAll(".circle")
        .data(circleStruct)
        .enter()
        .append('circle')
        .attr({
            "class": function(d) { 
                return 'circle ' + d.class
            },
            "cx": function(d) { 
                return px(transformX(d.x+0.5))
            },
            "cy": function(d) { 
                return px(transformY(d.y+0.5, d.ypage))
            },
            "r": function(d) { 
                return px(transformY(0.5))
            },
        });

      var pulses = svg.selectAll(".circle-pulse")
        .data(circleStruct)
        .enter()
        .append('circle')
        .attr('r', function(d) { 
                return px(transformY(0.5))
            })
        .style({'stroke': 'green', 'stroke-width': 2, 'fill': 'none'})
        .attr({
          "class": function(d) { 
              return 'circle-pulse ' + d.class
          },
          "cx": function(d) { 
              return px(transformX(d.x+0.5))
          },
          "cy": function(d) { 
              return px(transformY(d.y+0.5, d.ypage))
          }
        });

      for (p in pulses[0]) {
        if (p == 'parentNode') {
          continue;
        }
        var pulse = pulses[0][p];
        pulse.animate([
          { r:transformY(0.5), opacity: 0.5 },
          { r:transformY(2), opacity: 0 }
        ], {
          duration: 3000, //milliseconds
          easing: 'ease-in-out', //'linear', a bezier curve, etc.
          delay: 10, //milliseconds
          iterations: Infinity, //or a number
          direction: 'normal', //'normal', 'reverse', etc.
          fill: 'forwards' //'backwards', 'both', 'none', 'auto'
        });
      }

      

    applyCSS();
}
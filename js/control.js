$(document).ready(function() {
    setColors(index);

    $("a.switch").click(function(caller) {
        console.log('nice');
        index = (index + 1) % colorList.length;
        setColors(index);
    });

 	$(".expandAll").click(function(caller) {
     	var current = caller.currentTarget;
     	var expand = $(current.parentNode.parentNode).children('.panel');
        console.log(expand);

        if ($(current).text() === 'Hide All') {
            $(current).text('Expand All');
            expand.each(shrink);
        } else {
            $(current).text('Hide All');
            expand.each(grow);
        }
 	});


    $(".panel").click(function(caller) {
        var current = caller.currentTarget;
        if ($(current).css('height') == '160px') {
            grow(0, current);
        } else {
            shrink(0, current);
        }
    });

    console.log($(".flexPanelCol"));
    console.log($(".flexPanelCol").children())

    $(".seeMore").click(function(caller) {
        var current = caller.currentTarget;
        var expand = $(current.parentNode).children().css('display', 'block');
        $(current).css('display', 'none');
    });


    $(".flexPanelCol").each(function(index, value) {
        var isExtra = false;
        $(value).children().each(function(index, value) {
            var sthis = $(value);
            console.log(sthis);
            if (sthis.hasClass('seeMore')) {
                isExtra = true;
            } else if (isExtra) {
                sthis.css('display', 'none');
            }   
        });
    });


    $('a[href*=#]:not([href=#])').click(function() {
        if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') 
            || location.hostname == this.hostname) {

            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
            if (target.length) {
                $('html,body').animate({
                    scrollTop: target.offset().top
                }, 500);
                return false;
            }
        }
    });
});

var shrink = function(_, target) {
    console.log(target);
    //console.log($(target));
    var currHeight = $(target).get(0).getBoundingClientRect().height;
    $(target).css('max-height', currHeight);
    $(target).animate({'max-height': '160px'}, 250);
};

var grow = function(_, target) {
    $(target).animate({'max-height': '1300px'}, 500);
}

var index = 0;

var greens = {
    'normal': '#71BA51',//#f3f9f0',
    'light_1': '#a5d391',
    'light_2': '#c9e4bd',
    'light_3': '#edf6e9',
    'white': '#fff',
    'dark_1': '#508a37',
    'dark_2': '#3b6628',
    'grad': 'linear-gradient(rgba(113,186,81,0), rgba(113,186,81,1))',
    'red': '#e00',
    'headPic': 'url("images/possible/20150522_144426.jpg") no-repeat center center',
    'shadow': '0 0 20px rgba(0,0,0,0.5)',
    'subshadow': '0 0 20px rgba(0,0,0,1)'
};

var standard = {
    'white': '#eee',
    'black': '#222',
    'dark_green': '#3b6628',
    'light_green': '#71BA51',
    'dark_grey': '#444',
    'light_grey': '#666',
    'grad': 'linear-gradient(rgba(238,238,238,0), rgba(238,238,238,1))',
    'blue': '#00e',
    'red': '#e00',
    'headPic': 'url("mages/possible/20150522_141846.jpg") no-repeat center center',
    'shadow': '0 0 20px rgba(255,255,255,0)',
    'subshadow': '0 0 20px rgba(255,255,255,0)'
};

var colorList = [
    {
        'background':greens.normal,
        'heading':greens.white,
        'subheading':greens.light_2,
        'subheading2':greens.light_1,
        'text':greens.light_3,
        'link':greens.light_2,
        'link_hover':greens.red,
        'grad':greens.grad,
        'headPic': greens.headPic,
        'shadow': greens.shadow,
        'subshadow': greens.subshadow,
        'menuLink': greens.white
    },
    {
        'background':standard.white,
        'heading':standard.dark_grey,
        'subheading':standard.light_grey,
        'subheading2':standard.light_grey,
        'text':standard.black,
        'link':standard.blue,
        'link_hover':standard.red,
        'grad':standard.grad,
        'headPic': standard.headPic,
        'shadow': standard.shadow,
        'subshadow': standard.subshadow,
        'menuLink': standard.blue
    },
];

var selectList = {
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading',
    'h4': 'subheading',
    '.date': 'subheading2',
    'p': 'text',
    'a': 'link',
    'body': 'text',
    '.muted': 'subheading2',
    '.menuChild': 'menuLink'
}

var setColors = function(index) {
    var colors = colorList[index];

    $('body').css('background-color', colors['background']);
    $('.panel').before().attr('data-grad', colors['grad']);
    $('#imgHeader').css({
        'background': colors['headPic'],
        'background-size': 'cover'
    });

    $('.name').css({
        'text-shadow': colors['shadow']
    });

    $('.menuChild').css({
        'text-shadow': colors['subshadow']
    });


    $("a").mouseover(function() {
        $(this).css("color",colors['link_hover']);
    }).mouseout(function() {
        $(this).css("color",colors['link']);
    });

    $(".menuChild").mouseover(function() {
        $(this).css("color",colors['link_hover']);
    }).mouseout(function() {
        $(this).css("color",colors['menuLink']);
    });

    for (selector in selectList) {
        $(selector).css('color', colors[selectList[selector]]);
    }
    
}


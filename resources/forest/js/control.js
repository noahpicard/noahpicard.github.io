/* Control */

document.onkeydown = checkKey;

function checkKey(e) {

    e = e || window.event;

    if (e.keyCode == '38') {
        // up arrow
        var seed = new Date().getTime();
        //generateNewField(seed);
    }
    else if (e.keyCode == '40') {
        // down arrow
    }
    else if (e.keyCode == '37') {
       // left arrow
    }
    else if (e.keyCode == '39') {
       // right arrow
    }

}

var objects = [];


var field = {
    canvas : document.createElement("canvas"),
    start : function() {
        this.canvas.width = 960;
        this.canvas.height = 640;
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.frameNo = 0;
        this.lastGen = Math.floor(this.canvas.width/2)-(30/2*1);
        this.interval = setInterval(updateField, 2);
        this.cameraup = 0;
        },
    clear : function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}


function startGame() {
    field.start();
    
    create(new groundObj(960, 10, 0, 630));

}


function component(width, height, color, x, y, type) {
    this.type = type;
    this.score = 0;
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;    
    this.x = x;
    this.y = y;
    this.gravity = 0;
    this.gravitySpeed = 0;
    this.render = function() {
        ctx = field.context;
        if (this.type == "text") {
            ctx.font = this.width + " " + this.height;
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    this.newPos = function() {
        this.gravitySpeed += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY + this.gravitySpeed;
    }
}


function groundObj(width, height, x, y) {
	this.width = width;
    this.height = height;
	this.x = x;
    this.y = y;
    this.done = false;
	this.component = new component(this.width, this.height, "white", x, y);
	this.update = function() { 
        if (!this.done) {
          this.change();
        }
        this.component.render(); 
    };
	this.change = function() {
		if (Math.random() < 0.003) {
			var childX = this.x + (Math.random() * this.width)
			var childY = this.y - 3;
			create(new rootObj(childX, childY));
		}
	};
}

function rootObj(x, y) {
	this.width = 5;
    this.height = 3;
	this.x = x;
    this.y = y;
    this.done = false;
	this.component = new component(this.width, this.height, "white", x, y);
	this.update = function() { 
        if (!this.done) {
		  this.change();
        }
		this.component.render(); 
	};
	this.change = function() {
		if (Math.random() < 0.01) {
			var childX = this.x ;//+ (Math.random() * this.width)
			var childY = this.y - this.height;
            if (Math.random() < 0.02) {
                create(new trunkObj(childX, childY));
            } else {
			    create(new rootObj(childX, childY));
            }
            this.done = true;
		}
	};
}

function trunkObj(x, y) {
    this.width = 5;
    this.height = 3;
    this.x = x;
    this.y = y;
    this.done = false;
    this.component = new component(this.width, this.height, "red", x, y); //#00BB00
    this.update = function() { 
        if (!this.done) {
          this.change();
        }
        this.component.render(); 
    };
    this.change = function() {
        if (Math.random() < 0.01) {
            var childX = this.x ;
            var childY = this.y - this.height;
            var childLeft = this.x - 2;
            var childRight = this.x + this.width;
            if (Math.random() < 0.03) {
        
            } else {
                if (Math.random() < 0.1) {
                    create(new branchObj(childLeft, this.y, -1, 1));
                    create(new branchObj(childRight, this.y, 1, 1));
                }
                create(new trunkObj(childX, childY));
            }

            this.done = true;
        }
    };
}

function branchObj(x, y, xdiff, ydiff) {
    this.width = 2;
    this.height = 2;
    this.x = x;
    this.y = y;
    this.xdiff = xdiff;
    this.ydiff = ydiff;
    this.done = false;
    this.component = new component(this.width, this.height, "white", x, y);
    this.update = function() { 
        if (!this.done) {
          this.change();
        }
        this.component.render(); 
    };
    this.change = function() {
        if (Math.random() < 0.03) {
            var childX = this.x + (this.width * this.xdiff);
            var childY = this.y - (this.height * this.ydiff);
            var childOther = this.x - (this.width * this.xdiff);

            if (Math.random() < 0.07) {
                if (Math.random() < 0.1) {
                    //create(new appleObj(this.x, this.y+this.height));
                }
            } else {
                if (Math.random() < 0.03) {
                    create(new branchObj(childOther, childY, -this.xdiff, this.ydiff));
                }
                create(new branchObj(childX, childY, this.xdiff, this.ydiff));
            }

            this.done = true;
        }
    };
}

function appleObj(x, y, xdiff, ydiff) {
    this.width = 3;
    this.height = 3;
    this.x = x;
    this.y = y;
    this.xdiff = xdiff;
    this.ydiff = ydiff;
    this.done = true;
    this.component = new component(this.width, this.height, "red", x, y);
    this.update = function() { 
        if (!this.done) {
          this.change();
        }
        this.component.render(); 
    };
    this.change = function() {
    };
}


function create(obj) {
	objects.push(obj);
}

function updateField() {
    var x, height, gap, minHeight, maxHeight, minGap, maxGap, dist;
 
    field.clear();
    field.frameNo += 1;

    for (i = 0; i < objects.length; i += 1) {
        objects[i].update();
    }

}

function everyinterval(n) {
    if ((field.frameNo / n) % 1 == 0) {return true;}
    return false;
}
//
// RGB LED Board
//


var ws281x = require('rpi-ws281x-native'),
	_ = require('underscore');

var NUM_LEDS = 256,
	FPS = 30,
    pixelData = new Uint32Array(NUM_LEDS);

ws281x.init(NUM_LEDS);


var rowmap = [],
	colmap = [],
	indexmap = [];

for (var i = 0; i < 16; i++) {
	rowmap.push([]);
	colmap.push([]);
}
for (var x = 0; x < 16; x++) {
	for (var y = 0; y < 16; y++) {
		var i = x;
		if ((y % 2) == 1)
			i = 15 - i;
		i += y * 16;
		rowmap[x][y] = i;
		colmap[y][x] = i;
		indexmap[i] = [x,y];
	}
}


// exit cleanly with a cleared board
function CleanExit() {
	ws281x.reset();
	process.nextTick(function () { process.exit(0); });
}
// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
	CleanExit();
});



//
// Manage the writing of frames to the board
//
var frames = [];

setInterval(function() {
	if (frames.length) {
		var frame = frames.shift();
		// console.log(frame);
		ClearPixels(pixelData);
		WriteFrame(frame, pixelData);
		ws281x.render(pixelData);
	} else {
		// no frames left -- terminate
		CleanExit();
	}
}, 1000 / FPS);



function ClearPixels(pixels) {
	for (var i = 0; i < pixels.length; i++)
		pixels[i] = 0;
}


//
// Write a frame to a pixel array
// Handles each method to express a frame in terms of pixels, rows, columns, etc.
//
// TODO: Should be extensible with transform functions
//
function WriteFrame(frame, pixels) {
	if (_.isArray(frame.rows)) {
		WriteFrameRows(frame, pixels);
	}
	if (_.isArray(frame.cols)) {
		WriteFrameCols(frame, pixels);
	}
	if (frame.fill != null) {
		WriteFrameFill(frame, pixels);
	}
}

function WriteFrameFill(frame, pixels) {
	var color = ToColor(frame.fill);
	for (var i = 0; i < pixels.length; i++)
		pixels[i] = color;
}

function WriteFrameRows(frame, pixels) {
	for (var x = 0; x < frame.rows.length; x++) {
		var row = frame.rows[x];
		if (row != null) {
			for (var y = 0; y < row.length; y++) {
				if (row[y] != null && row[y] != 0) {
					var i = rowmap[x][y];
					var color = ToColor(row[y]);
					pixels[i] = color;
				}
			}
		}
	}
}

function WriteFrameCols(frame, pixels) {
	for (var y = 0; y < frame.cols.length; y++) {
		var col = frame.cols[y];
		if (col != null) {
			for (var x = 0; x < col.length; x++) {
				if (col[x] != null) {
					var i = colmap[x][y];
					var color = ToColor(col[x]);
					pixels[i] = color;
				}
			}
		}
	}
}


function ToColor(pv) {
	if (_.isObject(pv)) {
		if (pv.r != null)
			return rgb2Int(pv.r, pv.g, pv.b);
		if (pv.h != null)
			return HSV(pv.h, pv.s, pv.v);
		if (pv.hue)
			return colorwheel(pv.hue);
	} else {
		return pv;
	}
}


function HSV(h, s, v) {
    var r = 0,
    	g = 0,
    	b = 0;
    if (h < 60) {
        r = 255;
        g = h * 255 / 60;
    } else if (h < 120) {
        g = 255;
        r = (120 - h) * 255 / 60;
    } else if (h < 180) {
        g = 255;
        b = (h - 120) * 255 / 60;
    } else if (h < 240) {
        b = 255;
        g = (240 - h) * 255 / 60;
    } else if (h < 300) {
        b = 255;
        r = (h - 240) * 255 / 60;
    } else {
        r = 255;
        b = (360 - h) * 255 / 60;
    }
    // Scale to same total luminance; assumes each colour is similarly bright
    var lum = r + g + b;
    r = r * 255 / lum;
    g = g * 255 / lum;
    b = b * 255 / lum;
    
    // Scale for saturation and value
    var minv = (255 - s) * v / 255;
    var maxv = v;
    
    red = r * (maxv - minv) / 255 + minv;
    green = g * (maxv - minv) / 255 + minv;
    blue = b * (maxv - minv) / 255 + minv;

    return rgb2Int(red, green, blue);
}



//
// Functions to build frames
//

// 16x16 matrix fill
function Matrix(c) {
	var rs = [];
	for (var i = 0; i < 16; i++) {
		var row = [];
		for (var j = 0; j < 16; j++)
			row.push(c);
		rs.push(row);
	}
	return rs;
}


// empty row-wise frame
function RowFrame() {
	return {
		rows: Matrix(0)
	}
}


// 2x2 checkerboard
function Check2(c1, c2) {
	var fr = RowFrame();
	for (var x = 0; x < 16; x += 2) {
		for (var y = 0; y < 16; y += 2) {
			fr.rows[x][y] = c1;
			fr.rows[x][y+1] = c1;
			fr.rows[x+1][y] = c1;
			fr.rows[x+1][y+1] = c1;
		}
		var t = c1;
		c1 = c2;
		c2 = t;
	}
}


//
// Main test animation
//
for (var hue = 0; hue < 256; hue++) {
	var c1 = { hue: hue },
		c2 = { hue: 255-hue };
	frames.push(Check2(c1, c2));
}
// for (var x = 0; x < 16; x += 2) {
// 	for (var y = 0; y < 16; y += 2) {
// 		var fr = { rows: [] };
// 		var c = { h: x*16+y, s: 255, v: 128 };

// 		fr.rows[x] = [];
// 		fr.rows[x+1] = [];
// 		fr.rows[x][y] = c;
// 		fr.rows[x][y+1] = c;
// 		fr.rows[x+1][y] = c;
// 		fr.rows[x+1][y+1] = c;
// 		frames.push(fr);
// 	}
// }




/*

// ---- animation-loop
var offset = 0;
setInterval(function () {
  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = colorwheel((offset + i) % 256);
  }

  offset = (offset + 1) % 256;
  ws281x.render(pixelData);
}, 1000 / 30);

console.log('Press <ctrl>+C to exit.');

 */

// for (var i = 0; i < 256; i++)
// 	frames.push({fill: colorwheel(i)});



// for (var i = 0; i < 1024; i += 4) {
// 	var row = [], fr = { rows: [] };
// 	for (var y = 0; y < 16; y++)
// 		row.push((i % 256) + (y*5));
// 	for (var i = 0; i < 16; i++)
// 		fr.rows.push(row);
// 	frames.push(fr);
// }


// var fr = { rows: [] };
// var row = [];
// for (var i = 0; i < 16; i++)
// 	row.push(colorwheel(i*5));
// for (var i = 0; i < 16; i++)
// 	fr.rows.push(row);
// for (var i = 0; i < 30; i++)
// 	frames.push(fr);



setTimeout(function() {
	CleanExit();
}, 120000);



function colorwheel(pos) {
	pos = 255 - pos;
	if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
	else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
	else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}

function rgb2Int(r, g, b) {
	return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}


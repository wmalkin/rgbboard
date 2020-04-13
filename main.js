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
			i = 16 - i;
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
		WriteFrame(frame, pixelData);
		ws281x.render(pixelData);
	} else {
		// no frames left -- terminate
		CleanExit();
	}
}, 1000 / FPS);




//
// Write a frame to a pixel array
// Handles each method to express a frame in terms of pixels, rows, columns, etc.
//
// TODO: Should be extensible with transform functions
//
function WriteFrame(frame, pixels) {
	if (_.isArray(frame.rows)) {
		WriteFrameRows(frame, pixels);
	} else if (_.isArray(frame.cols)) {
		WriteFrameCols(frame, pixels);
	} else if (frame.fill != null) {
		WriteFrameFill(frame, pixels);
	}
}

function WriteFrameFill(frame, pixels) {
	var color = frame.fill;
	for (var i = 0; i < pixels.length; i++)
		pixels[i] = color;
}

function WriteFrameRows(frame, pixels) {
	for (var x = 0; x < frame.rows.length; x++) {
		var row = frame.rows[x];
		for (var y = 0; y < row.length; y++) {
			if (row[y] != null) {
				var i = rowmap[x][y];
				var color = row[y];
				pixels[i] = color;
			}
		}
	}
}


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

for (var i = 0; i < 1024; i += 4) {
	var row = [], fr = { rows: [] };
	for (var y = 0; y < 16; y++)
		row.push((i % 256) + (y*5));
	for (var i = 0; i < 16; i++)
		fr.rows.push(row);
	frames.push(fr);
}


setTimeout(function() {
	CleanExit();
}, 30000);



function colorwheel(pos) {
	pos = 255 - pos;
	if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
	else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
	else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}

function rgb2Int(r, g, b) {
	return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}


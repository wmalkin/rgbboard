//
// RGB LED Board
//


var ws281x = require('rpi-ws281x-native'),
	_ = require('underscore');

var NUM_LEDS = 256,
	FPS = 30,
    pixelData = new Uint32Array(NUM_LEDS);

ws281x.init(NUM_LEDS);

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
  ws281x.reset();
  process.nextTick(function () { process.exit(0); });
});



//
// 
var frames = [];

setInterval(function() {
	if (frames.length) {
		var frame = frames.shift();
		WriteFrame(frame, pixelData);
		ws281x.render(pixelData);
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
	var color = IntColor(frame.fill);
	for (var i = 0; i < pixels.length; i++)
		pixels[i] = color;
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

for (var i = 0; i < 256; i++)
	frames.push({fill: colorwheel(i)});







function colorwheel(pos) {
	pos = 255 - pos;
	if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
	else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
	else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}

function rgb2Int(r, g, b) {
	return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}


// Canopy View module
(function (Canopy) {

  Canopy.View = {};

  var ctx = Canopy.waveformDOM.getContext('2d');

  var width;
  var height = 384;

  var rulerHeight = 30;


  // Local variables
  var zoomLevel = -1;
  var zoomFactor = 0.5; // = 2 ^ zoomLevel
  var sampleOffset = 0;
  var renderedBuffer = null;  

  var clearColor = '#ECEFF1';
  var rulerColor = '#37474F';
  var rulerGridColor = '#CFD8DC';
  var rulerGridLineWidth = 1.0;
  var rulerFont = '9px Arial';
  var waveformColor = '#03A9F4';
  var waveformCenterLineColor = '#B0BEC5';
  var waveformLineWidth = 1.0;
  
  var needsRedraw = false;

  // in Samples.
  var viewStart = 0;
  var viewEnd = 0;
  // var viewLength = 128;
  var viewAnchor = 64;

  var bufferLength = 0;
  var pixelsPerSample = 0;
  var grids = [2500, 500, 250, 100, 25]; // samples
  var gridSize; // sample

  function clearView() {
    ctx.fillStyle = clearColor;
    ctx.fillRect(0, 0, width, height);
  }

  function drawRuler() {
    
    var nextGrid = viewStart + gridSize - (viewStart % gridSize);
    var x = 0;

    ctx.fillStyle = rulerColor;
    ctx.strokeStyle = rulerGridColor;
    ctx.lineWidth = rulerGridLineWidth;
    
    ctx.fillRect(0, 0, width, rulerHeight);
    
    ctx.beginPath();
    ctx.fillStyle = rulerGridColor;
    ctx.font = rulerFont;

    for (var i = viewStart; i < viewEnd; i++) {
      // Draw a grid when the buffer index passes the grid position.
      if (i >= nextGrid) {
        ctx.fillText(nextGrid, x, 15);
        ctx.moveTo(x, 20);
        ctx.lineTo(x, 28.5);
        nextGrid += gridSize;
      }
      x += pixelsPerSample;
    }
    ctx.stroke();
  }

  // function drawWaveform() {
  //   if (renderedBuffer) {
  //     ctx.strokeStyle = ctx.fillStyle = waveformColor;
  //     ctx.lineWidth = waveformLineWidth;

  //     var length = renderedBuffer.length;
  //     var waveformHeight = height - rulerHeight - 1;
  //     var y_length, y_offset;

  //     ctx.save();
  //     ctx.translate(0, rulerHeight + 1);
  //     ctx.beginPath();
  //     if (zoomFactor >= 2) {
  //       // When zooming out. Draw blob based on absolute amplitude.
  //       var index = sampleOffset;
  //       for (var x = 0; x < width; x++) {
  //         if (index < length) {
  //           y_length = Math.abs(renderedBuffer[index]) * waveformHeight;
  //         } else {
  //           y_length = 0.0;
  //         }
  //         y_offset = (waveformHeight - y_length) * 0.5;
  //         ctx.moveTo(x, y_offset);
  //         ctx.lineTo(x, y_offset + y_length);
  //         index += zoomFactor;
  //       }
  //     } else {
  //       // When zooming in. Use line drawing between samples.
  //       var interval = 1 / zoomFactor;
  //       var numSamples = Math.min(width, (length - sampleOffset) * zoomFactor);
  //       var x_offset = 0;
  //       for (i = 0; i < numSamples; i++) {
  //         if (i < length) {
  //           y_offset = renderedBuffer[sampleOffset + i] * 0.5 + 0.5;
  //         } else {
  //           y_offset = 0.5;
  //         }
  //         y_offset *= waveformHeight;
  //         ctx.lineTo(x_offset, y_offset);
  //         ctx.fillRect(x_offset - 1, y_offset - 1, 3, 3);
  //         x_offset += interval;
  //       }
  //     }
  //     ctx.stroke();
  //     ctx.restore();
            
  //   } else {
  //     console.log('Canopy(!) Invalid audio buffer. Cannot be rendered.');
  //   }
  // }

  function drawWaveform2() {

    if (!renderedBuffer) {
      console.log('Canopy(!) Invalid audio buffer. Cannot be rendered.'); 
      return;
    }

    var waveformHeight = height - rulerHeight - 1;
    var x = 0, px = 0, y_offset;

    ctx.save();
    ctx.translate(0, rulerHeight + 1);

    // Draw center line.
    ctx.beginPath();
    ctx.strokeStyle = waveformCenterLineColor;
    ctx.moveTo(0, waveformHeight * 0.5);
    ctx.lineTo(width, waveformHeight * 0.5);
    ctx.stroke();

    // Draw waveform.
    ctx.beginPath();
    ctx.strokeStyle = ctx.fillStyle = waveformColor;
    ctx.lineWidth = waveformLineWidth;
    for (var i = viewStart; i < viewEnd; i++) {
      // Draw only when the advance is bigger than one pixel.
      if (x - px >= 1) {
        y_offset = renderedBuffer[i] * 0.5 + 0.5;
        y_offset *= waveformHeight;
        ctx.lineTo(x, y_offset);
        // Draw sample dots beyond 2x zoom.
        if (pixelsPerSample > 2)
          ctx.fillRect(x - 1.5, y_offset - 1.5, 3, 3);
        px = x;
      }
      x += pixelsPerSample;
    }
    ctx.stroke();
    
    ctx.restore();
  }

  // Render!
  function render() {
    if (needsRedraw) {
      clearView();
      // drawWaveform();
      drawWaveform2();
      drawRuler();
      // renderScrollBar();
      // updateStat();
      needsRedraw = false;
    }
    requestAnimationFrame(render);  
  }

  Canopy.View.resize = function () {
    width = window.innerWidth - Canopy.config.editorWidth;
    // height = window.innerHeight - Canopy.config.titleBarHeight;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
  };

  Canopy.View.setBuffer = function (buffer) {
    renderedBuffer = buffer.getChannelData(0);
    viewStart = 0;
    viewEnd = bufferLength = renderedBuffer.length;
    pixelsPerSample = width / (viewEnd - viewStart);
    var gridLevel = ~~(10 * Math.log10(pixelsPerSample + 1));
    // console.log(gridLevel);
    gridSize = grids[Math.min(4, gridLevel)];
    needsRedraw = true;
  };

  Canopy.View.zoom = function (deltaY, x) {
    var deltaFactor = deltaY / pixelsPerSample / width;
    viewStart -= ~~(deltaFactor * x);
    viewEnd += ~~(deltaFactor * (width - x));
    viewStart = Math.max(viewStart, 0);
    viewEnd = Math.min(viewEnd, bufferLength);
    pixelsPerSample = width / (viewEnd - viewStart);

    var gridLevel = ~~(10 * Math.log10(pixelsPerSample + 1));
    // console.log(gridLevel);
    gridSize = grids[Math.min(4, gridLevel)];
    needsRedraw = true;
  };

  Canopy.View.pan = function (deltaX) {
    // TOFIX: remove aliasing!!
    var delta = ~~(deltaX / pixelsPerSample);
    if (viewStart + delta < 0 || viewEnd + delta > bufferLength)
      return;
    viewStart += delta;
    viewEnd += delta;
    needsRedraw = true;
  };

  /* Event handlers */  
  window.onresize = function () {
    Canopy.View.resize();
    needsRedraw = true;
  };

  var prevX = 0, dX = 0;
  var prevY = 0, dY = 0;

  var mouseHandler = new MouseResponder('waveform', Canopy.waveformDOM, 
    function (sender, action, data) {
      // console.log(action, data);
      switch (action) {
        case 'clicked':
          prevX = data.x;
          prevY = data.y;
          dX = 0;
          dY = 0;
          break;
        case 'dragged':
          dX = prevX - data.x;
          dY = prevY - data.y;
          // TOFIX: latch: X or Y?
          if (dX * dX >= dY * dY) {
            Canopy.View.pan(dX); 
          } else {
            Canopy.View.zoom(dY * 10, data.x);
          }          
          prevX = data.x;
          prevY = data.y;
          break;
      }
    }
  );

  // Boot up the gfx engine.
  Canopy.View.resize();
  render();

})(Canopy);






/*

// === old codes === //
function renderRuler(ctx, startPosition, hopSize, interval, viewWidth) {



  ctx.fillStyle = "#263238";
  ctx.strokeStyle = "#ECEFF1";
  ctx.lineWidth = 1.0;
  
  ctx.fillRect(0, 0, viewWidth, 30);
  
  console.log(startPosition);
  
  ctx.beginPath();

  // When the zoom level is above 'sample-level', use simple rendering 
  // for optimum performance.
  if (interval === 1) {
    for (var x = 0; x < viewWidth; x++) {
      // if (index % 1024 === 0) {
      //   ctx.moveTo(x, 10);
      //   ctx.lineTo(x, 28.5);
      // } else if (index % 128 === 0) {
      //   ctx.moveTo(x, 20);
      //   ctx.lineTo(x, 28.5);
      // }
      // index += hopSize;
    }

  } else {

    // If the zoom level is below sample-level, use linear-interpolation 
    // (line drawing) between samples.
    var numSamples = Math.min(viewWidth, (channelData.length - startPosition) / interval);
    var x_offset = 0;
    for (i = 0; i < numSamples; i++) {
      if (index < length) {
        y_offset = channelData[startPosition + i] * 0.5 + 0.5;
      } else {
        y_offset = 0.5;
      }
      y_offset *= viewHeight;
      ctx.lineTo(x_offset, y_offset);
      ctx.fillRect(x_offset - 1, y_offset - 1, 3, 3);
      x_offset += interval;
    }
  }

  ctx.stroke();
}


function renderSpectrogram(canvasID, data) {
  var contextSpec = spectrogramDOM.getContext('2d');
  var width = 1200;
  var height = 300;
  spectrogramDOM.width = width;
  spectrogramDOM.height = height;
  contextSpec.strokeStyle = 'blue';
  contextSpec.clearRect(0, 0, width, height);
  

  var frame = data.subarray(0, 128);
  console.log(frame);

  fft.forward(frame);

  for (var i = 0; i < fft.spectrum.length/2; i++) {
    var magnitude = fft.spectrum[i];
    // console.log(magnitude);
    contextSpec.fillStyle = 'rgba(0, 0, 0, ' + magnitude + ')';
    contextSpec.fillRect(0, i * 5, 5, 5);
  }

  
  // for (var frame = 0; frame < 2; frame++) {

  //   console.log('frame = ' + frame);

  //   console.log('= signal =');

  //   spectrogramData.map(function (value, i, n) {
  //     // value.real = hanning[i] * lastRenderedChannelData[frame * 128 + i];
  //     // value.real = blackman[i] * lastRenderedChannelData[frame * 128 + i];
  //     value.real = lastRenderedChannelData[frame * 128 + i];
  //     console.log(value.real);
  //   });
    
  //   spectrogramData.FFT();

  //   var nyquist = spectrogramData.real.length * 0.5;
  //   var real = spectrogramData.real;
  //   var imag = spectrogramData.imag;

  //   console.log('= real =');

  //   for (var i = 0; i < spectrogramData.real.length; i++) {
  //     console.log(spectrogramData.real[i]);
  //   }

  //   console.log('= imag =');

  //   for (var i = 0; i < spectrogramData.imag.length; i++) {
  //     console.log(spectrogramData.imag[i]);
  //   }

  //   imag[0] = 0.0; // To blow above the nyquist.
  //   var magScale = 1.0 / 256;
  //   var minDecibel = -120;
    
  //   for (var i = 0; i < nyquist; i++) {
  //     var value = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * magScale;
  //     var db = Math.max(minDecibel, 20 * Math.log10(value));
  //     db = 1.0 + (db * 0.01);
  //     db = Math.min(1.0, Math.max(0.0, db));
  //     // console.log(db);
  //     contextSpec.fillStyle = 'rgba(0, 0, 0, ' + db + ')';
  //     contextSpec.fillRect(frame * 5, i * 5, 5, 5);
  //   }

  // }
}

// === end === //

 */
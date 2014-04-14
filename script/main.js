var app = angular.module('app', []);

app.controller('InterfaceCtrl', function($scope, Configurator, SoundService) {
  $scope.Configurator = Configurator;
  $scope.SoundService = SoundService;

  angular.element(document).bind('keydown', function(event){
    switch (event.which){
      case 32: {
        event.preventDefault();
        console.log('Pushed space');
        SoundService.playSound();
      }
    }
  })

});

app.factory('Configurator', function() {
  var Configurator = {};
  Configurator.fs = 44100;
  //duration in seconds
  Configurator.duration = 0.003;
  Configurator.loop = true;

  return Configurator;
});

app.directive('wavdraw', function(Configurator, SoundService) {
  return {
    restrict: 'A',
    link: function(scope, element) {
      var ctx = element[0].getContext('2d');

      // variable that decides if something should be drawn on mousemove
      var drawing = false;

      // the last coordinates before the current move
      var lastX;
      var lastY;
      var lastSX;
      var lastSY;

      var soundArray = new Array(Math.round(Configurator.fs * Configurator.duration));
      updateArray();

      scope.$watch(function() {
        return Configurator.duration;
      }, function(newVal, oldVal) {
        console.log('Changed value...');
        if(newVal>1)
          Configurator.duration = 1.5;

        updateArray();
        redraw();
      });

      function updateArray() {
        soundArray = new Array(Math.round(Configurator.fs * Configurator.duration));
        // create random sound array
        var sin = 0.5 * soundArray.length / Math.PI;
        for (var i = 0; i < soundArray.length; i++) {
          soundArray[i] = Math.sin(i / (sin));
        }

        totalSamples = Configurator.fs * Configurator.duration;
        barLength = element[0].width / totalSamples;
        center = element[0].height / 2;

      }

      SoundService.createSound(soundArray);


      var totalSamples = Configurator.fs * Configurator.duration;
      var barLength = element[0].width / totalSamples;
      var center = element[0].height / 2;

      redraw();

      // draw array
      function redraw() {
        element[0].width = element[0].width;

        ctx.fillStyle = '#44ab99';
        for (var i = 0; i < soundArray.length; i++) {

          var yPos = (soundArray[i]) * element[0].height / 2;
          var xPos = i;

          // ctx.beginPath();
          ctx.fillRect(xPos * barLength, center, barLength - 4, yPos);
          // console.log(xPos*barLength + " " +center + " " +(xPos+1)*barLength + " " +yPos);
          // ctx.closePath();
          //ctx.rect(20,20,100,100);

        }


        // draw line in the middle
        ctx.beginPath();
        ctx.moveTo(0, element[0].height / 2);
        ctx.lineTo(element[0].width, element[0].height / 2);
        ctx.stroke();
        ctx.closePath;
      }

      function setSample(x, y) {
        var sampleStartIndex = Math.floor(x / barLength);
        var val = 2 * y / (element[0].height) - 1;
        soundArray[sampleStartIndex] = val;
        if (barLength < 1) {
          var l = Math.ceil(1 / barLength);
          for (var i = 1; i < l; i++) {
            soundArray[sampleStartIndex + i] = val;
          }
        }
      }

      element.bind('mousedown', function(event) {
        if (event.offsetX !== undefined) {
          lastX = event.offsetX;
          lastY = event.offsetY;
        } else {
          lastX = event.layerX - event.currentTarget.offsetLeft;
          lastY = event.layerY - event.currentTarget.offsetTop;
        }

        lastSX = lastX;

        setSample(lastX, lastY);
        // begins new line
        ctx.beginPath();

        drawing = true;
      });
      element.bind('mousemove', function(event) {
        if (drawing) {
          // get current mouse position
          if (event.offsetX !== undefined) {
            currentX = event.offsetX;
            currentY = event.offsetY;
          } else {
            currentX = event.layerX - event.currentTarget.offsetLeft;
            currentY = event.layerY - event.currentTarget.offsetTop;
          }


          setSample(currentX, currentY);
          lastSX = currentX;

          var diff = lastSX - lastX;
          var change = lastY / lastX;
          if (Math.abs(diff) >= barLength) {
            var iterations = diff / barLength;
            for (var i = 1; i < iterations; i++) {
              setSample(lastSX + barLength * i, currentY - change / (iterations - i));
            }
          }


          draw(lastX, lastY, currentX, currentY);

          // // set current coordinates to last one
          lastX = currentX;
          lastY = currentY;
        }

      });
      element.bind('mouseup', function(event) {
        redraw();
        SoundService.createSound(soundArray);
        // stop drawing
        drawing = false;
      });

      // canvas reset
      function reset() {
        element[0].width = element[0].width;
      }

      function draw(lX, lY, cX, cY) {
        ctx.beginPath();
        // line from
        ctx.moveTo(lX, lY);
        // to
        ctx.lineTo(cX, cY);
        // color
        ctx.strokeStyle = "#f45";
        // draw it
        ctx.stroke();

        ctx.closePath();
      }
    }
  }
});


angular.module('app').factory('SoundService', function(Configurator) {
  var SoundService = new Object();
  var context = window.AudioContext || window.webkitAudioContext || window.MozAudioContext || window.mozAudioContext;

  if(!context){
    window.alert("Your browser does not support WebAudio or uses an incompatible version of it");
  }

  var context = new context();


  var sound = null;
  var soundArray = null;

  SoundService.createSound = function(array) {
    soundArray = array;
    if (isPlaying) {
      SoundService.playSound();
      SoundService.playSound();
    }
    console.log('SoundArray was set!');
    //var buffer = SoundService.context.createBuffer(data);
  }

  var isPlaying = false;
  SoundService.playSound = function() {

    if(isPlaying){
      sound.stop(0);
      isPlaying = false;
      return;
    }

    var currentTime = context.currentTime;
    var gain = context.createGain();

    var node = context.createBufferSource(),
      buffer = context.createBuffer(1, Configurator.fs * Configurator.duration, context.sampleRate),
      data = buffer.getChannelData(0);

    for (var i = 0; i < soundArray.length; i++) {
      data[i] = soundArray[i];
    }

    console.log('Sound was created!');

    node.buffer = buffer;
    sound = node;
    sound.loop = Configurator.loop;
    sound.connect(gain);
    gain.connect(SoundService.masterGain);
    sound.start(currentTime);
    isPlaying = true;

  }

  SoundService.masterGain = context.createGain();
  SoundService.masterGain.gain.value = 0.04;
  SoundService.masterGain.connect(context.destination);
  return SoundService;
});

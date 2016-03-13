var context = new (window.AudioContext || window.webkitAudioContext)();
var stream = null;
var alphabet = "\n abcdefghijklmnopqrstuvwxyz,.!";
var start = '^';
var end = '$';
var freqMin = 440;
var freqMax = 1760;
//var freqMin = 18500;
//var freqMax = 19500;
var range = freqMax - freqMin;
var processing = false;
var listening = false;

function submit() {
  if(processing)
    return;
  var message = document.getElementById('message').value;
  processing = true;
  process(message.toLowerCase());
}

function listen() {
  var message = document.getElementById('message');
  message.value = "";
  
  var listen_text = document.getElementById('listen').innerText;
  if(listen_text == "Cancel") {
    listening = false;
    processing = false;
    document.getElementById('listen').innerText = "Listen";
    document.getElementById('submit').disabled = false;
    message.placeholder = "Type Message";
  } else {
    listening = true;
    processing = true;
    document.getElementById('listen').innerText = "Cancel";
    document.getElementById('submit').disabled = true;
    message.placeholder = "Listening...";
  }
}

function listening() {
  var timeout = 300; //ms
  var constraints = {
    audio: { optional: [{ echoCancellation: false }] }
  };
  
  stream = navigator.mediaDevices.getUserMedia(constraints)
  .then(function(mediaStream) { ... })
  .catch(function(error) { ... })
}

function process(message) {
  if(message.length == 0)
    return;

  var message = start + message + end;
  
  var i = 0;
  for(i; i < message.length; i++) {
    var tone;
    var char = message[i];
    var time = context.currentTime + 0.2*i;
    if(char === start) {
      tone = freqMin;
    }
    else if(char === end) {
      tone = freqMax;
    }
    else {
      tone = toFreq(char);
    }
    emit(tone, time);
  }
  setTimeout(function() {
    processing = false;
  }, 200 * message.length);
}

function toFreq(char) {
  var index = alphabet.indexOf(char);
  if(index === -1) {
    console.error('Invalid character: ', char);
    index = alphabet.length - 1;
  }
  var percent = index / alphabet.length;
  var offset = Math.round(range * percent);
  return freqMin + offset;
}

function toChar(freq) {
  if(!(freqMin < freq && freq < freqMax)) {
    if(freqMin - freq < 40) {
      freq = freqMin;
    } else if (freq - freqMax < 40) {
      freq = freqMax;
    } else {
      console.error("Invalid frequency: ", freq);
      return;
    }
  }
  
  var percent = (freq - freqMin) / range;
  var index = Math.round(alphabet.length * percent);
  return alphabet[index];
}

function emit(tone, time) {
  // GainNode
  var gainNode = context.createGain();
  gainNode.gain.value = 0;
  gainNode.gain.setValueAtTime(0, time);
  gainNode.gain.linearRampToValueAtTime(1, time + 0.001);
  gainNode.gain.setValueAtTime(1, time + 0.2 - 0.001);
  gainNode.gain.linearRampToValueAtTime(0, time + 0.2);
  gainNode.connect(context.destination);
  
  // Oscillator
  var oscillator = context.createOscillator();
  oscillator.frequency.value = tone;
  oscillator.connect(gainNode);
  oscillator.start(); 
}

function restart() {
  window.location.reload();
}
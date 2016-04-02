var context = new (window.AudioContext || window.webkitAudioContext)();
var analyser = context.createAnalyser();

var buf = new Float32Array( 1024 );
var MIN_SAMPLES = 0; // To be initailzed when context is set
var mediaStreamSource = null;
var analyser = null;

var alphabet = "^\n abcdefghijklmnopqrstuvwxyz$";
var emoticons = ["^", "smile", "cry", "cool", "sleep", "sob", "uneasy", "$"];
var start = '^';
var end = '$';

var supersonic = false;
var freqMin = 440;
var freqMax = 1760;

var range = freqMax - freqMin;
var processing = false;
var listening = false;

var message = "";
var emoji = "";
var capturing = false;
var finished_capturing = false;

function submit() {
  if(processing)
    return;
  var message = document.getElementById('message').value;
  if(message.length === 0)
    return;
  processing = true;
  document.getElementById('submit').disabled = true;
  process(message.toLowerCase());
}

function listen() {
  if(!document.getElementById('emoji_box').checked) {
    var message = document.getElementById('message');
    message.value = "";
  
    var listen_text = document.getElementById('listen').innerText;
    if(listen_text == "Cancel") {
      listening = false;
      processing = false;
      document.getElementById('message_listen').innerText = "Listen";
      document.getElementById('submit').disabled = false;
      message.placeholder = "Type Message";
    } else {
      listening = true;
      processing = true;
      document.getElementById('message_listen').innerText = "Cancel";
      document.getElementById('submit').disabled = true;
      message.placeholder = "Listening...";
      liveInput();
    }
  } else {
    if(listening) {
      listening = false;
      processing = false;
      document.getElementById('emoji_listen').innerText = "Listen";
    } else {
      listening = true;
      processing = true;
      document.getElementById('emoji_listen').innerText = "Cancel";
      liveInput();
    }
  }
}

window.onload = function() {
  document.getElementById("emoji_wrapper").style.display = "none";
}

document.getElementById('supersonic').onclick = function() {
  if(supersonic) {
    supersonic = false;
    freqMin = 440;
    freqMax = 1760;
  } else {
    supersonic = true;
    freqMin = 18500;
    freqMax = 19500;
  }
}

document.getElementById('emoji_box').onclick = function() {
  if(document.getElementById('emoji_box').checked) {
    document.getElementById("message_wrapper").style.display = "none";
    document.getElementById("emoji_wrapper").style.display = "block";
  }
  else {
    document.getElementById("message_wrapper").style.display = "block";
    document.getElementById("emoji_wrapper").style.display = "none";
  }
}

function selected(emoji) {
  processEmoji(emoji.name);
}

function stopListening() {
  listening = false;
  processing = false;
  if(document.getElementById('emoji_box').checked) {
    document.getElementById('emoji_listen').innerText = "Listen";
    emoji = "";
  } else {
    document.getElementById('listen').innerText = "Listen";
    document.getElementById('submit').disabled = false;
    message.placeholder = "Type Message";
    message = "";
  }
  capturing = false;
  finished_capturing = false;
}

function error() {
  alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
  try {
    navigator.getUserMedia = 
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;
      navigator.getUserMedia(dictionary, callback, error);
  } catch (e) {
      alert('getUserMedia threw exception :' + e);
  }
}

function gotStream(stream) {
  // Create an AudioNode from the stream.
  mediaStreamSource = context.createMediaStreamSource(stream);

  // Connect it to the destination.
  analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  mediaStreamSource.connect(analyser);
  if(document.getElementById('emoji_box').checked) {
    updateEmoji();
  } else {
    updatePitch();
  }
}

function output() {
  if(typeof arguments !== undefined && arguments.length > 0) {
    var result = arguments.join("");
    var message = document.getElementById('message');
    message.value = result;
  }
}

function liveInput() {
  getUserMedia(
    {
      "audio": {
        "mandatory": {
          "googEchoCancellation": "false",
          "googAutoGainControl": "false",
          "googNoiseSuppression": "false",
          "googHighpassFilter": "false"
        },
        "optional": []
      },
    }, gotStream);
}

function autoCorrelate(buf, sampleRate) {
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE/2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);
  
  for(var i = 0; i < SIZE; i++) {
    var val = buf[i];
    rms += Math.pow(val, 2);
  }
  
  rms = Math.sqrt(rms/SIZE);
  if(rms < 0.01) {
    //Not enough signal
    return -1;
  }
  
  var lastCorrelation = 1;
  for(var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;
    
    for(var i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i]) - (buf[i + offset]));
    }
    correlation = 1 - (correlation/MAX_SAMPLES);
    correlations[offset] = correlation; // Store for later
    
    if((correlation > 0.9) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if(correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
      return sampleRate/(best_offset + (8 * shift));
    }
    lastCorrelation = correlation;
  }
  
  if(best_correlation > 0.01) {
    return sampleRate/best_offset;
  }
  return -1;
}

function updateEmoji() {
  var cycles = new Array;
  analyser.getFloatTimeDomainData(buf);
  var ac = autoCorrelate(buf, context.sampleRate);
  
  var freq = null;
  
  if(ac !== -1 && ac < freqMax && ac > freqMin) {
    freq = ac;
    var note = toEmoji(freq);
    if(note === "^") {
      capturing = true;
    }
    if(capturing && note != "^") {
      emoji = note;
      capturing = false;
      finished_capturing = true;
    }
    console.log(note);
  }
  if(finished_capturing) {
    selectEmoji(emoji);
    //stopListening();
    emoji = "";
  }
  if(listening) {
    setTimeout(function() {
      window.requestAnimationFrame(updateEmoji);
    }, 190);
  }
}

function updatePitch() {
  var cycles = new Array;
  analyser.getFloatTimeDomainData(buf);
  var ac = autoCorrelate(buf, context.sampleRate);
  
  var freq = null;
  
  // console.log(freq);
  
  if(ac !== -1 && ac < freqMax && ac > freqMin) {
    freq = ac;
    var note = toChar(freq);
    if(note === "^") {
      capturing = true;
    }
    if(note === "$") {
      capturing = false;
      finished_capturing = true;
    }
    if(capturing && note != "^") {
      message += note;
    }
    console.log(note);
  } else {
    //console.log("ac is -1");
  }
  if(finished_capturing) {
    output("Received: \"", message, "\""   );
    stopListening();
  }
  if(listening) {
    setTimeout(function() {
      window.requestAnimationFrame(updatePitch);
    }, 190)
  }
}

function selectEmoji(emoji) {
  if(emoji === "" || typeof emoji === undefined || !emoji) {
    console.error("Unable to read emoji");
  } else {
    var placeholder = document.getElementById("result_area");
    var path = "images/" + emoji + ".png";
    placeholder.src = path;
  }
}

function process(message) {
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
    document.getElementById('submit').disabled = false;
  }, 200 * message.length);
}

function processEmoji(emoji) {
  
  emit(freqMin, context.currentTime);
  emit(toEmojiFreq(emoji), context.currentTime + 0.2);
  emit(freqMax, context.currentTime + 0.4);
  
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

function toEmojiFreq(emoji) {
  var index = emoticons.indexOf(emoji);
  if(index === -1) {
    console.error("Invalid emoji: ", emoji);
    index = emoticons.length - 1;
  }
  var percent = index / emoticons.length;
  var offset = Math.round(range * percent);
  return freqMin + offset;
}

function toChar(freq, emoji) {
  if(!(freqMin < freq && freq < freqMax)) {
    if(freqMin - freq < 50) {
      freq = freqMin;
    } else if (freq - freqMax < 50) {
      freq = freqMax;
    } else {
      console.error("Invalid frequency: ", freq);
      return;
    }
  }
  
  var percent = (freq - freqMin) / range;
  var index = Math.round(alphabet.length * percent);
  if(index == alphabet.length)
    return alphabet[index-1];
  return alphabet[index];
} 

function toEmoji(freq) {
  if(!(freqMin < freq && freq < freqMax)) {
    if(freqMin - freq < 50) {
      freq = freqMin;
    } else if (freq - freqMax < 50) {
      freq = freqMax;
    } else {
      console.error("Invalid frequency: ", freq);
      return;
    }
  }
  
  var percent = (freq - freqMin) / range;
  var index = Math.round(emoticons.length * percent);
  if(index == emoticons.length)
    return emoticons[index-1];
  return emoticons[index];
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
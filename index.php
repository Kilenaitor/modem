<!DOCTYPE html>
<html>

<head>
    <title>WebAudio Modem</title>
    <link rel="stylesheet" href="./main.css" type="text/css" media="screen">
</head>

<body>
    <div id="wrapper">
        <h1 id="title">WebAudio Modem</h1>
        <div id="message_wrapper">
            <input id="message" name="message" placeholder="Type Message" />
            <br />
            <button id="submit" onclick="submit(); return false;">Send</button>
            <br />
            <button id="message_listen" onclick="listen(); return false;">Listen</button>
            <br />
        </div>
        <div id="emoji_wrapper">
            <div class="result">
                <img id="result_area" src="images/placeholder.png" name="result" />
            </div>
            <div class="image_row">
                <img class="emoji" src="images/smile.png" onclick="selected(this); return false;" name="smile" />
                <img class="emoji" src="images/sleep.png" onclick="selected(this); return false;" name="sleep" />
                <img class="emoji" src="images/sob.png" onclick="selected(this); return false;" name="sob" />
            </div>
            <div class="image_row">
                <img class="emoji" src="images/cool.png" onclick="selected(this); return false;" name="cool" />
                <img class="emoji" src="images/cry.png" onclick="selected(this); return false;" name="cry" />
                <img class="emoji" src="images/uneasy.png" onclick="selected(this); return false;" name="uneasy" />
            </div>
            <button id="emoji_listen" onclick="listen(); return false;">Listen</button>
            <br />
        </div>
        <input id="supersonic" type="checkbox">Supersonic</button>
        <input id="emoji_box" type="checkbox">Emojis</button>
    </div>
    <script type="text/javascript" src="./main.js"></script>
</body>

</html>
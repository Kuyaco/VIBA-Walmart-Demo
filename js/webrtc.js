$(document).ready(function() {   

document.body.classList.add('default');

var mobile;
if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
	var mobile = true;
} else {
	var mobile = false;
}

destination = getSearchVariable("destination");

navigator.geolocation.getCurrentPosition(setLocation);

var latitude;
var longitude;

function setLocation(position) {
	latitude = position.coords.latitude;
	longitude = position.coords.longitude;
}

function getSearchVariable(variable) {
       var search = window.location.search.substring(1);
       var vars = search.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}

function getCookie(name) {
	var pattern = RegExp(name + "=.[^;]*");
	matched = document.cookie.match(pattern);
	if(matched) {
		var cookie = matched[0];
		return cookie;
	}
	return false
}

var cookie = getCookie("userID");

function makeid() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < 6; i++)
	text += possible.charAt(Math.floor(Math.random() * possible.length));
	
	return "3" + text;
}

if (cookie == "") {
	var userID = makeid();
	timestamp = new Date();
	var expires = 1825;
        timestamp.setDate(timestamp.getDate() + expires);
	document.cookie = ('userID=' + userID + '; expires=' + timestamp.toUTCString());
} else {
	value = cookie.split('=')[1]
	userID = value;
}	

JsSIP.debug.enable('JsSIP:*');

// Config settings
var socket = new JsSIP.WebSocketInterface('wss://troc.staging.vocinity.com:443');
var configuration = {
	sockets  : [ socket ],
	uri      : ('sip:' + userID + '@troc.vocinity.com'),
	register : true
};

var sipStack = new JsSIP.UA(configuration);
var MediaStream = window.MediaStream;	
var audio = document.createElement('audio');
var remoteVideo = document.createElement('remoteVideo');
var localVideo = document.createElement('localVideo');

var remoteUrl = $("#remoteUrl");
var remoteImg = $("#remoteImg");
var overlayFS = $("#overlay-fs");
var mediaType = null;

// sipStack callbacks 
sipStack.on('connected', function(e) {
        	urlCall(destination);
		$("#connected").fadeIn(500);
        });
sipStack.on('disconnected', function(e) {
		$("#connected").hide();
        });
sipStack.on('newSession', function(e) {
        if (e.data.session.direction == "incoming") {
        	incommingCall(e);
        	}
	});
sipStack.on('newMessage', function(e) {
	if (e.message.direction === 'outgoing') {
		console.log('Sending Message!');
	}
	else if (e.message.direction === 'incoming') {
		console.log('Received Message Dude!');
		let msg = JSON.parse(e.request.body);
		
		if (msg.type === 'COD_START') {
			console.log('COD_START')
			console.log(msg.contentType)
			console.log(msg.contentLink)
			switch (msg.contentType) {
				case "video": //Show Video
					console.log(msg.contentLink)
					remoteUrl.attr('src', msg.contentLink);
					remoteUrl[0].load();
					remoteUrl.removeClass('hide');
					try {
						remoteUrl[0].play();
					} catch (error) {
						console.error(error);
					}
					mediaType = "video";
					break;
				case "image": //Show Image
					console.log(msg.contentLink)
					remoteImg.attr('src', msg.contentLink);
					remoteImg.removeClass('hide');
					mediaType = "image";
					break;
				default:
					break;
			}
			overlayFS.addClass('show');

		} else if (msg.type === 'COD_STOP') {
			console.log('COD_STOP')
			switch (mediaType) {
				case "video": //Hide Video
					remoteUrl[0].pause();
					remoteUrl.addClass('hide');
					break;
				case "image": //Hide Image
					remoteImg.addClass('hide');
					break;
				default:
					break;
			}
			overlayFS.removeClass('show');
	
		}
		
		// let url = msg.type;
		// e.message.accept();
		// $("#remoteUrl").show();
		// remoteUrl.setAttribute('src', url);
		// remoteUrl.play();
		// document.getElementById('remoteUrl').addEventListener('ended',hideRemoteUrl,false);

    	// 	function hideRemoteUrl(e) {
        // 		$("#remoteUrl").hide();
		// 	}
	}
});
sipStack.on('registered', function(e) {
        });
sipStack.on('registrationFailed', function(e) {
	});

sipStack.start();

sipStack.on('newRTCSession', function(data){
	session = data.session;
        session.connection.addEventListener('track', function (e) {
		console.log(e);
		if (e.track.kind === "audio") {
			audio.srcObject = e.streams[0];
			audio.play();
		}
        });

	if (session.direction === "outgoing") {
    		session.on('confirmed', (e) => {
			// Setup remoteVideo stream
			var remoteVideo = $('#remoteVideo')[0];
			var remoteStream = new MediaStream();
			remoteVideo.srcObject = session.connection.getReceivers().forEach(function(receiver) {
				console.log(receiver);
				if (receiver.track.kind === "video") {
					remoteStream.addTrack(receiver.track);
				}
			});
			remoteVideo.srcObject = remoteStream;
        		$('#remoteVideo').fadeIn(100);
			// Setup localVideo stream
			var localVideo = $('#localVideo')[0];
			var localStream = new MediaStream();
			localVideo.srcObject = session.connection.getSenders().forEach(function(sender) {
				console.log(sender);
				if (sender.track.kind === "video") {
					localStream.addTrack(sender.track);
				}
			});
			localVideo.srcObject = localStream;
        		$('#localVideo').fadeIn(100);
		});
	}
});

// URL call
function urlCall(destination) {
	// Register callbacks to desired call events
	var eventHandlers = {
		'connecting': function(e) {
	},
		'progress': function(e) {
	},
		'failed': function(e) {
		endCall();
	},
		'ended': function(e) {
		endCall();
	},
		'confirmed': function(e) {
	}
	};

	var options = {
		'eventHandlers'		: eventHandlers,
		'extraHeaders'		: [ 'X-Location: ' + latitude + ',' + longitude ],
		'mediaConstraints'	: { 'audio': true, 'video': true },
	};

	$("#hangup").fadeIn(1000);

        session = sipStack.call(destination, options);
}

$('#hangup').click(function() {
	try {
	        session.terminate();
	} catch {
	}
	remoteUrl.pause();
	$("#remoteUrl").fadeOut(100);	
        endCall();
});

$('#mic').click(function() {
	$("#mic").fadeOut(100);
	$("#mic_off").fadeIn(100);
	toggleMute();
});

$('#mic_off').click(function() {
	$("#mic").fadeIn(100);
	$("#mic_off").fadeOut(100);
	toggleMute();
});

$('#videocam').click(function() {
	$("#videocam").fadeOut(100);
	$("#videocam_off").fadeIn(100);
	toggleLocalVideo();
});

$('#videocam_off').click(function() {
	$("#videocam").fadeIn(100);
	$("#videocam_off").fadeOut(100);
	toggleLocalVideo();
});

var session;

function endCall() {
	$("#remoteVideo").fadeOut(100);
	$("#connected").fadeOut(100);
	//window.location.assign("https://www.vocinity.com");
}

function terminateSession() {    
	try {    
		session.terminate();    
	}                                  
	catch(error) {    
		console.error(error);    
	}                 
}                                                                                     

function toggleMute() {
	if(session.isMuted().audio) {
        	session.unmute({audio: true});
	} else {
        	session.mute({audio: true});   
	}
}

function toggleLocalVideo() {
	if ($('#localVideo').is(':hidden')) {
		$('#localVideo').show();
		session.unmute({video: true});
	} else {
		$('#localVideo').hide();
		session.mute({video: true});
	}
}


$(window).on("beforeunload", function() {    
	terminateSession();                                                      
});    
                  
$(window).on("unload", function() {    
	terminateSession();    
}); 

});

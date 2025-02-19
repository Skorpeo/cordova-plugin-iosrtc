/**
 * Expose the RTCPeerConnection class.
 */
module.exports = RTCPeerConnection;


/**
 * Dependencies.
 */
var
	debug = require('debug')('iosrtc:RTCPeerConnection'),
	debugerror = require('debug')('iosrtc:ERROR:RTCPeerConnection'),
	exec = require('cordova/exec'),
	randomNumber = require('random-number').generator({min: 10000, max: 99999, integer: true}),
	YaetiEventTarget = require('yaeti').EventTarget,
	RTCSessionDescription = require('./RTCSessionDescription'),
	RTCIceCandidate = require('./RTCIceCandidate'),
	RTCDataChannel = require('./RTCDataChannel'),
	RTCDTMFSender = require('./RTCDTMFSender'),
	RTCStatsResponse = require('./RTCStatsResponse'),
	RTCStatsReport = require('./RTCStatsReport'),
	MediaStream = require('./MediaStream'),
	MediaStreamTrack = require('./MediaStreamTrack'),
	Errors = require('./Errors');


debugerror.log = console.warn.bind(console);


function RTCPeerConnection(pcConfig, pcConstraints) {
	debug('new() | [pcConfig:%o, pcConstraints:%o]', pcConfig, pcConstraints);

	var self = this;

	// Make this an EventTarget.
	YaetiEventTarget.call(this);
	Object.defineProperty(this, 'localDescription', { get: function() { return this._localDescription;} });
	Object.defineProperty(this, 'connectionState', { get: function() { return this.iceConnectionState;} });

	// Public atributes.
	this._localDescription = null;
	this.remoteDescription = null;
	this.signalingState = 'stable';
	this.iceGatheringState = 'new';
	this.iceConnectionState = 'new';
	this.pcConfig = fixPcConfig(pcConfig);
	// Private attributes.
	this.pcId = randomNumber();
	this.localStreams = {};
	this.remoteStreams = {};

	function onResultOK(data) {
		onEvent.call(self, data);
	}

	exec(onResultOK, null, 'iosrtcPlugin', 'new_RTCPeerConnection', [this.pcId, this.pcConfig, pcConstraints]);
}

RTCPeerConnection.prototype = Object.create(YaetiEventTarget.prototype);
RTCPeerConnection.prototype.constructor = RTCPeerConnection;


RTCPeerConnection.prototype.createOffer = function () {
	var self = this,
		isPromise,
		options,
		callback, errback;

	if (typeof arguments[0] !== 'function') {
		isPromise = true;
		options = arguments[0];
	} else {
		isPromise = false;
		callback = arguments[0];
		errback = arguments[1];
		options = arguments[2];
	}

	if (isClosed.call(this)) {
		return;
	}

	debug('createOffer() [options:%o]', options);

	if (isPromise) {
		return new Promise(function (resolve, reject) {
			function onResultOK(data) {
				if (isClosed.call(self)) {
					return;
				}

				var desc = new RTCSessionDescription(data);

				debug('createOffer() | success [desc:%o]', desc);
				resolve(desc);
			}

			function onResultError(error) {
				if (isClosed.call(self)) {
					return;
				}

				debugerror('createOffer() | failure: %s', error);
				reject(new global.DOMException(error));
			}

			exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_createOffer', [self.pcId, options]);
		});
	}

	function onResultOK(data) {
		if (isClosed.call(self)) {
			return;
		}

		var desc = new RTCSessionDescription(data);

		debug('createOffer() | success [desc:%o]', desc);
		callback(desc);
	}

	function onResultError(error) {
		if (isClosed.call(self)) {
			return;
		}

		debugerror('createOffer() | failure: %s', error);
		if (typeof errback === 'function') {
			errback(new global.DOMException(error));
		}
	}

	exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_createOffer', [this.pcId, options]);
};


RTCPeerConnection.prototype.createAnswer = function () {
	var self = this,
		isPromise,
		options,
		callback, errback;

	if (typeof arguments[0] !== 'function') {
		isPromise = true;
		options = arguments[0];
	} else {
		isPromise = false;
		callback = arguments[0];
		errback = arguments[1];
		options = arguments[2];
	}

	if (isClosed.call(this)) {
		return;
	}

	debug('createAnswer() [options:%o]', options);

	if (isPromise) {
		return new Promise(function (resolve, reject) {
			function onResultOK(data) {
				if (isClosed.call(self)) {
					return;
				}

				var desc = new RTCSessionDescription(data);

				debug('createAnswer() | success [desc:%o]', desc);
				resolve(desc);
			}

			function onResultError(error) {
				if (isClosed.call(self)) {
					return;
				}

				debugerror('createAnswer() | failure: %s', error);
				reject(new global.DOMException(error));
			}

			exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_createAnswer', [self.pcId, options]);
		});
	}

	function onResultOK(data) {
		if (isClosed.call(self)) {
			return;
		}

		var desc = new RTCSessionDescription(data);

		debug('createAnswer() | success [desc:%o]', desc);
		callback(desc);
	}

	function onResultError(error) {
		if (isClosed.call(self)) {
			return;
		}

		debugerror('createAnswer() | failure: %s', error);
		if (typeof errback === 'function') {
			errback(new global.DOMException(error));
		}
	}

	exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_createAnswer', [this.pcId, options]);
};



RTCPeerConnection.prototype.setLocalDescription = function (desc) {
	var self = this,
		isPromise,
		callback, errback;

	if (typeof arguments[1] !== 'function') {
		isPromise = true;
	} else {
		isPromise = false;
		callback = arguments[1];
		errback = arguments[2];
	}

	if (isClosed.call(this)) {
		if (isPromise) {
			return new Promise(function (resolve, reject) {
				reject(new Errors.InvalidStateError('peerconnection is closed'));
			});
		} else {
			throw new Errors.InvalidStateError('peerconnection is closed');
		}
	}

	// "This is no longer necessary, however; RTCPeerConnection.setLocalDescription() and other
	// methods which take SDP as input now directly accept an object conforming to the RTCSessionDescriptionInit dictionary,
	// so you don't have to instantiate an RTCSessionDescription yourself.""
	// Source: https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription/RTCSessionDescription#Example
	// Still we do instnanciate RTCSessionDescription, so internal object is used properly.

	if (!(desc instanceof RTCSessionDescription)) {
		desc = new RTCSessionDescription(desc);
	}

	if (isPromise) {
		return new Promise(function (resolve, reject) {
			function onResultOK(data) {
				if (isClosed.call(self)) {
					return;
				}

				debug('setLocalDescription() | success');
				// Update localDescription.
				self.localDescription = new RTCSessionDescription(data);
				resolve();
			}

			function onResultError(error) {
				if (isClosed.call(self)) {
					return;
				}

				debugerror('setLocalDescription() | failure: %s', error);
				reject(new Errors.InvalidSessionDescriptionError('setLocalDescription() failed: ' + error));
			}

			exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_setLocalDescription', [self.pcId, desc]);
		});
	}

	function onResultOK(data) {
		if (isClosed.call(self)) {
			return;
		}

		debug('setLocalDescription() | success');
		// Update localDescription.
		self.localDescription = new RTCSessionDescription(data);
		callback();
	}

	function onResultError(error) {
		if (isClosed.call(self)) {
			return;
		}

		debugerror('setLocalDescription() | failure: %s', error);

		if (typeof errback === 'function') {
			errback(new Errors.InvalidSessionDescriptionError('setLocalDescription() failed: ' + error));
		}
	}

	exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_setLocalDescription', [this.pcId, desc]);
};


RTCPeerConnection.prototype.setRemoteDescription = function (desc) {
	var self = this,
		isPromise,
		callback, errback;

	if (typeof arguments[1] !== 'function') {
		isPromise = true;
	} else {
		isPromise = false;
		callback = arguments[1];
		errback = arguments[2];
	}

	if (isClosed.call(this)) {
		if (isPromise) {
			return new Promise(function (resolve, reject) {
				reject(new Errors.InvalidStateError('peerconnection is closed'));
			});
		} else {
			throw new Errors.InvalidStateError('peerconnection is closed');
		}
	}

	debug('setRemoteDescription() [desc:%o]', desc);

	// "This is no longer necessary, however; RTCPeerConnection.setLocalDescription() and other
	// methods which take SDP as input now directly accept an object conforming to the RTCSessionDescriptionInit dictionary,
	// so you don't have to instantiate an RTCSessionDescription yourself.""
	// Source: https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription/RTCSessionDescription#Example
	// Still we do instnanciate RTCSessionDescription so internal object is used properly.

	if (!(desc instanceof RTCSessionDescription)) {
		desc = new RTCSessionDescription(desc);
	}

	if (isPromise) {
		return new Promise(function (resolve, reject) {
			function onResultOK(data) {
				if (isClosed.call(self)) {
					return;
				}

				debug('setRemoteDescription() | success');
				// Update remoteDescription.
				self.remoteDescription = new RTCSessionDescription(data);
				resolve();
			}

			function onResultError(error) {
				if (isClosed.call(self)) {
					return;
				}

				debugerror('setRemoteDescription() | failure: %s', error);
				reject(new Errors.InvalidSessionDescriptionError('setRemoteDescription() failed: ' + error));
			}

			exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_setRemoteDescription', [self.pcId, desc]);
		});
	}

	function onResultOK(data) {
		if (isClosed.call(self)) {
			return;
		}

		debug('setRemoteDescription() | success');
		// Update remoteDescription.
		self.remoteDescription = new RTCSessionDescription(data);
		callback();
	}

	function onResultError(error) {
		if (isClosed.call(self)) {
			return;
		}

		debugerror('setRemoteDescription() | failure: %s', error);

		if (typeof errback === 'function') {
			errback(new Errors.InvalidSessionDescriptionError('setRemoteDescription() failed: ' + error));
		}
	}

	exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_setRemoteDescription', [this.pcId, desc]);
};



RTCPeerConnection.prototype.addIceCandidate = function (candidate) {
	var self = this,
		isPromise,
		callback, errback;

	if (typeof arguments[1] !== 'function') {
		isPromise = true;
	} else {
		isPromise = false;
		callback = arguments[1];
		errback = arguments[2];
	}

	if (isClosed.call(this)) {
		if (isPromise) {
			return new Promise(function (resolve, reject) {
				reject(new Errors.InvalidStateError('peerconnection is closed'));
			});
		} else {
			throw new Errors.InvalidStateError('peerconnection is closed');
		}
	}

	debug('addIceCandidate() | [candidate:%o]', candidate);

	if (typeof candidate !== 'object') {
		if (isPromise) {
			return new Promise(function (resolve, reject) {
				reject(new global.DOMException('addIceCandidate() must be called with a RTCIceCandidate instance or RTCIceCandidateInit object as argument'));
			});
		} else {
			if (typeof errback === 'function') {
				errback(new global.DOMException('addIceCandidate() must be called with a RTCIceCandidate instance or RTCIceCandidateInit object as argument'));
			}
			return;
		}
	}

	if (isPromise) {
		return new Promise(function (resolve, reject) {
			function onResultOK(data) {
				if (isClosed.call(self)) {
					return;
				}

				debug('addIceCandidate() | success');
				// Update remoteDescription.
				if (self.remoteDescription && data.remoteDescription) {
					self.remoteDescription.type = data.remoteDescription.type;
					self.remoteDescription.sdp = data.remoteDescription.sdp;
				} else if (data.remoteDescription) {
					self.remoteDescription = new RTCSessionDescription(data.remoteDescription);
				}
				resolve();
			}

			function onResultError() {
				if (isClosed.call(self)) {
					return;
				}

				debugerror('addIceCandidate() | failure');
				reject(new global.DOMException('addIceCandidate() failed'));
			}

			exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_addIceCandidate', [self.pcId, candidate]);
		});
	}

	function onResultOK(data) {
		if (isClosed.call(self)) {
			return;
		}

		debug('addIceCandidate() | success');
		// Update remoteDescription.
		if (self.remoteDescription && data.remoteDescription) {
			self.remoteDescription.type = data.remoteDescription.type;
			self.remoteDescription.sdp = data.remoteDescription.sdp;
		} else if (data.remoteDescription) {
			self.remoteDescription = new RTCSessionDescription(data.remoteDescription);
		}
		callback();
	}

	function onResultError() {
		if (isClosed.call(self)) {
			return;
		}

		debugerror('addIceCandidate() | failure');
		if (typeof errback === 'function') {
			errback(new global.DOMException('addIceCandidate() failed'));
		}
	}

	exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_addIceCandidate', [this.pcId, candidate]);
};


RTCPeerConnection.prototype.getConfiguration = function () {
	debug('getConfiguration()');

	return this.pcConfig;
};


RTCPeerConnection.prototype.getLocalStreams = function () {
	debug('getLocalStreams()');

	var streams = [],
		id;

	for (id in this.localStreams) {
		if (this.localStreams.hasOwnProperty(id)) {
			streams.push(this.localStreams[id]);
		}
	}

	return streams;
};


RTCPeerConnection.prototype.getRemoteStreams = function () {
	debug('getRemoteStreams()');

	var streams = [],
		id;

	for (id in this.remoteStreams) {
		if (this.remoteStreams.hasOwnProperty(id)) {
			streams.push(this.remoteStreams[id]);
		}
	}

	return streams;
};


RTCPeerConnection.prototype.getStreamById = function (id) {
	debug('getStreamById()');

	return this.localStreams[id] || this.remoteStreams[id] || null;
};


RTCPeerConnection.prototype.addStream = function (stream) {
	if (isClosed.call(this)) {
		throw new Errors.InvalidStateError('peerconnection is closed');
	}

	debug('addStream()');

	if (!(stream instanceof MediaStream)) {
		throw new Error('addStream() must be called with a MediaStream instance as argument');
	}

	if (this.localStreams[stream.id]) {
		debugerror('addStream() | given stream already in present in local streams');
		return;
	}

	this.localStreams[stream.id] = stream;

	exec(null, null, 'iosrtcPlugin', 'RTCPeerConnection_addStream', [this.pcId, stream.id]);
};


RTCPeerConnection.prototype.removeStream = function (stream) {
	if (isClosed.call(this)) {
		throw new Errors.InvalidStateError('peerconnection is closed');
	}

	debug('removeStream()');

	if (!(stream instanceof MediaStream)) {
		throw new Error('removeStream() must be called with a MediaStream instance as argument');
	}

	if (!this.localStreams[stream.id]) {
		debugerror('removeStream() | given stream not present in local streams');
		return;
	}

	delete this.localStreams[stream.id];

	exec(null, null, 'iosrtcPlugin', 'RTCPeerConnection_removeStream', [this.pcId, stream.id]);
};


RTCPeerConnection.prototype.createDataChannel = function (label, options) {
	if (isClosed.call(this)) {
		throw new Errors.InvalidStateError('peerconnection is closed');
	}

	debug('createDataChannel() [label:%s, options:%o]', label, options);

	return new RTCDataChannel(this, label, options);
};


RTCPeerConnection.prototype.createDTMFSender = function (track) {
	if (isClosed.call(this)) {
		throw new Errors.InvalidStateError('peerconnection is closed');
	}

	debug('createDTMFSender() [track:%o]', track);

	return new RTCDTMFSender(this, track);
};

RTCPeerConnection.prototype.getStats = function () {
	var self = this,
		isPromise,
		selector,
		callback, errback;

	if (typeof arguments[0] !== 'function') {
		isPromise = true;
		selector = arguments[0];
	} else {
		isPromise = false;
		callback = arguments[0];
		selector = arguments[1];
		errback = arguments[2];
	}

	if (selector && !(selector instanceof MediaStreamTrack)) {
		throw new Error('getStats() must be called with null or a valid MediaStreamTrack instance as argument');
	}

	if (isClosed.call(this)) {
		throw new Errors.InvalidStateError('peerconnection is closed');
	}

	debug('getStats() [selector:%o]', selector);

	if (isPromise) {
		return new Promise(function (resolve, reject) {
			function onResultOK(array) {
				if (isClosed.call(self)) {
					return;
				}

				var res = [];
				array.forEach(function (stat) {
					res.push(new RTCStatsReport(stat));
				});
				resolve(new RTCStatsResponse(res));
			}

			function onResultError(error) {
				if (isClosed.call(self)) {
					return;
				}

				debugerror('getStats() | failure: %s', error);
				reject(new global.DOMException(error));
			}

			exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_getStats', [self.pcId, selector ? selector.id : null]);
		});
	}

	function onResultOK(array) {
		if (isClosed.call(self)) {
			return;
		}

		var res = [];
		array.forEach(function (stat) {
			res.push(new RTCStatsReport(stat));
		});
		callback(new RTCStatsResponse(res));
	}

	function onResultError(error) {
		if (isClosed.call(self)) {
			return;
		}

		debugerror('getStats() | failure: %s', error);
		if (typeof errback === 'function') {
			errback(new global.DOMException(error));
		}
	}

	exec(onResultOK, onResultError, 'iosrtcPlugin', 'RTCPeerConnection_getStats', [this.pcId, selector ? selector.id : null]);
};

RTCPeerConnection.prototype.close = function () {
	if (isClosed.call(this)) {
		return;
	}

	debug('close()');

	exec(null, null, 'iosrtcPlugin', 'RTCPeerConnection_close', [this.pcId]);
};


/**
 * Private API.
 */


function fixPcConfig(pcConfig) {
	if (!pcConfig) {
		return {
			iceServers: []
		};
	}

	var iceServers = pcConfig.iceServers,
		i, len, iceServer;

	if (!Array.isArray(iceServers)) {
		pcConfig.iceServers = [];
		return pcConfig;
	}

	for (i = 0, len = iceServers.length; i < len; i++) {
		iceServer = iceServers[i];

		// THe Objective-C wrapper of WebRTC is old and does not implement .urls.
		if (iceServer.url) {
			continue;
		} else if (Array.isArray(iceServer.urls)) {
			iceServer.url = iceServer.urls[0];
		} else if (typeof iceServer.urls === 'string') {
			iceServer.url = iceServer.urls;
		}
	}

	return pcConfig;
}


function isClosed() {
	return this.signalingState === 'closed';
}


function onEvent(data) {
	var type = data.type,
   self = this,
		event = new Event(type),
		stream,
		dataChannel,
		id;
		Object.defineProperty(event, 'target', {value: self, enumerable: true});

	debug('onEvent() | [type:%s, data:%o]', type, data);

	switch (type) {
		case 'signalingstatechange':
			this.signalingState = data.signalingState;
			break;

		case 'icegatheringstatechange':
			this.iceGatheringState = data.iceGatheringState;
			break;

		case 'iceconnectionstatechange':
			this.iceConnectionState = data.iceConnectionState;

			// Emit "connected" on remote streams if ICE connected.
			if (data.iceConnectionState === 'connected') {
				for (id in this.remoteStreams) {
					if (this.remoteStreams.hasOwnProperty(id)) {
						this.remoteStreams[id].emitConnected();
					}
				}
			}
			break;

		case 'icecandidate':
			if (data.candidate) {
				event.candidate = new RTCIceCandidate(data.candidate);
			} else {
				event.candidate = null;
			}
			// Update localDescription.
			if (this._localDescription) {
				this._localDescription.type = data.localDescription.type;
				this._localDescription.sdp = data.localDescription.sdp;
			} else {
				this._localDescription = new RTCSessionDescription(data);
			}
			break;

		case 'negotiationneeded':
			break;

		case 'addstream':
			stream = MediaStream.create(data.stream);
			event.stream = stream;

			// Append to the remote streams.
			this.remoteStreams[stream.id] = stream;

			// Emit "connected" on the stream if ICE connected.
			if (this.iceConnectionState === 'connected' || this.iceConnectionState === 'completed') {
				stream.emitConnected();
			}
			break;

		case 'removestream':
			stream = this.remoteStreams[data.streamId];
			event.stream = stream;

			// Remove from the remote streams.
			delete this.remoteStreams[stream.id];
			break;

		case 'datachannel':
			dataChannel = new RTCDataChannel(this, null, null, data.channel);
			event.channel = dataChannel;
			break;
	}

	this.dispatchEvent(event);
}

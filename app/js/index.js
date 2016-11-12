// Copyright (c) 2012, Sungguk Lim. Please see the AUTHORS file for details.
// All rights reserved. Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var inputOutput;
var self;

document.addEventListener('DOMContentLoaded', function() {
  $('#settingsModal').modal('show');
  showWarningIfChromeOs();
}, false);

var showWarningIfChromeOs = function() {
  var userAgent = navigator.userAgent;
  // TODO: Use Rex.
  if (userAgent.includes('CrOS') &&
      userAgent.includes('54.0')) {
    $('#warning-alert').show();
  }
};

/*
 *  Utility functions
 *
 *  TODO: Extract to another file
 */

// Converts ArrayBuffer to String.
var ab2str = function(buf) {
  var bufView = new Uint8Array(buf);
  var unis = [];
  for (var i = 0; i < bufView.length; i++) {
    unis.push(bufView[i]);
  }
  return String.fromCharCode.apply(null, unis);
};

// Converts String to ArrayBuffer.
var str2ab = function(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

var getIndexByValue = function(element, value) {
  var list = element.options;
  for (var i = 0; i < list.length; i++) {
    if (list[i].value === value) {
      return i;
    }
  }
};

var Crosh = function(argv) {
  this.argv_ = argv;
  this.io = null;
  this.keyboard_ = null;
  this.pid_ = -1;
  this.connectionId = -1;
  this.portInfo_ = null;
  this.run = function() {
    this.io = this.argv_.io.push();

    this.io.onVTKeystroke = this.sendString_.bind(this, true /* fromKeyboard */);
    this.io.sendString = this.sendString_.bind(this, false /* fromKeyboard */);
    this.io.println('Beagle Term. https://github.com/beagleterm/beagle-term');
    inputOutput = this.io;
    self = this;

    chrome.serial.getDevices(function(ports) {
      if (ports.length > 0) {
        ports.forEach(function(portNames) {
          var portPicker = document.querySelector('#portDropdown');
          var portName = portNames.path;
          portPicker.innerHTML = portPicker.innerHTML + '<option value="' +
            portName + '">' + portName + '</option>';
        });
      }
    });

    // TODO: Pass json object instead of each element('bitrate', 'dataBits' ..)
    chrome.storage.local.get('bitrate', function(result) {
      var bitrateSelectElement = document.querySelector('#bitrateDropdown');

      if (result.bitrate !== undefined) {
        bitrateSelectElement.selectedIndex =
            getIndexByValue(bitrateSelectElement, result.bitrate.toString());
      } else {
        bitrateSelectElement.selectedIndex =
          getIndexByValue(bitrateSelectElement, '115200');
      }
    });

    chrome.storage.local.get('dataBits', function(result) {
      var databitSelectElement = document.querySelector('#databitDropdown');

      if (result.dataBits !== undefined) {
        databitSelectElement.selectedIndex =
          getIndexByValue(databitSelectElement, result.dataBits);
      } else {
        databitSelectElement.selectedIndex =
                getIndexByValue(databitSelectElement, 'eight');
      }
    });

    chrome.storage.local.get('parityBit', function(result) {
      var paritybitSelectElement = document.querySelector('#parityDropdown');

      if (result.parityBit !== undefined) {
        paritybitSelectElement.selectedIndex =
                getIndexByValue(paritybitSelectElement, result.parityBit);
      } else {
        paritybitSelectElement.selectedIndex =
                getIndexByValue(paritybitSelectElement, 'no');
      }
    });

    chrome.storage.local.get('stopBits', function(result) {
      var stopbitSelectElement = document.querySelector('#stopbitDropdown');
      if (result.stopBits !== undefined) {
        stopbitSelectElement.selectedIndex =
                getIndexByValue(stopbitSelectElement, result.stopBits);
      } else {
        stopbitSelectElement.selectedIndex =
                getIndexByValue(stopbitSelectElement, 'one');
      }
    });

    chrome.storage.local.get('ctsFlowControl', function(result) {
      var fcSelectElement = document.querySelector('#flowControlDropdown');
      if (result.ctsFlowControl !== undefined) {
        fcSelectElement.selectedIndex =
            getIndexByValue(fcSelectElement, result.ctsFlowControl.toString());
      } else {
        fcSelectElement.selectedIndex =
                getIndexByValue(fcSelectElement, 'false');
      }
    });
  };

  this.sendString_ = function(fromKeyboard, string) {
    chrome.serial.send(self.connectionId, str2ab(string), function() { });
  };

  this.exit = function(code) {
  };
};

window.onload = function() {
  hterm.defaultStorage = new lib.Storage.Chrome(chrome.storage.sync);
  var t = new hterm.Terminal('opt_profileName');
  t.decorate(document.querySelector('#terminal'));

  t.onTerminalReady = function() {
    t.runCommandClass(Crosh, document.location.hash.substr(1));
    return true;
  };
};

// Closes the settings dialog
var connectBtn = document.querySelector('#connectBtn');
connectBtn.addEventListener('click', function(event) {
  // If |inputOutput| is null, it means hterm is not ready yet.
  if (!inputOutput) {
    return;
  }

  // Get the serial port (i.e. COM1, COM2, COM3, etc.)
  var portElement = document.querySelector('#portDropdown');
  var port = portElement.options[portElement.selectedIndex].value;

  // Get the baud rate (i.e. 9600, 38400, 57600, 115200, etc. )
  var baudElement = document.querySelector('#bitrateDropdown');
  var bitrate = Number(baudElement.options[baudElement.selectedIndex].value);

  // Get the data bit (i.e. "seven" or "eight")
  var databitElement = document.querySelector('#databitDropdown');
  var databit = databitElement.options[databitElement.selectedIndex].value;

  // Get the parity bit (i.e. "no", "odd", or "even")
  var paritybitElement = document.querySelector('#parityDropdown');
  var parity = paritybitElement.options[paritybitElement.selectedIndex].value;

  // Get the stop bit (i.e. "one" or "two")
  var stopbitElement = document.querySelector('#stopbitDropdown');
  var stopbit = stopbitElement.options[stopbitElement.selectedIndex].value;

  // Get the flow control value (i.e. true or false)
  var fcElement = document.querySelector('#flowControlDropdown');
  var flowControlValue = fcElement.options[fcElement.selectedIndex].value;
  var flowControl = (flowControlValue === 'true');

  // Format is ...
  // settings = Object {bitrate: 14400, dataBits: "eight", parityBit: "odd",
  // stopBits: "two", ctsFlowControl: true}
  var settings = {
    bitrate: bitrate,
    dataBits: databit,
    parityBit: parity,
    stopBits: stopbit,
    ctsFlowControl: flowControl
  };

  chrome.storage.local.set(settings);

  chrome.serial.connect(port, {
    'bitrate': settings.bitrate,
    'dataBits': settings.dataBits,
    'parityBit': settings.parityBit,
    'stopBits': settings.stopBits,
    'ctsFlowControl': settings.ctsFlowControl
  }, function(openInfo) {
    if (openInfo === undefined) {
      inputOutput.println('Unable to connect to device with value' +
          settings.toString());
      // TODO: Open 'connection dialog' again.
      return;
    }

    inputOutput.println('Device found on ' + port +
              ' via Connection ID ' + openInfo.connectionId);
    self.connectionId = openInfo.connectionId;
    AddConnectedSerialId(openInfo.connectionId);
    chrome.serial.onReceive.addListener(function(info) {
      if (info && info.data) {
        inputOutput.print(ab2str(info.data));
      }
    });
  });
});

// Closes the settings dialog
var WarningSpan = document.querySelector('#warning-detail');
WarningSpan.addEventListener('click', function(event) {
  window.open('https://github.com/beagleterm/beagle-term/issues/78');
});

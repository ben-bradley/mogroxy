var	http = require('http'),
	url = require('url'),
	path = require('path'),
	child = require('child_process'),
	fs = require('fs');

http.createServer(function(reqClient, resClient) {
 var	oUrl = url.parse(reqClient.url,true),
 		oOptions = {
 		 host: oUrl.host,
 		 port: (oUrl.port) ? oUrl.port : 80,
 		 path: oUrl.path,
 		 method: reqClient.method
 		};
 var reqServer = http.request(oOptions, function(resServer) {
  if (resServer.statusCode != 200) { // catch & fwd headers not OK 
   resClient.writeHead(resServer.statusCode, resServer.headers);
   resClient.end();
  }
  else if (resServer.headers['content-type'].match(/image/)) { // catch & mogrify images
   var	sExt = path.extname(oUrl.path),
  		iLength = parseInt(resServer.headers['content-length']),
  		iCur = 0,
  		bufData = new Buffer(iLength);
   resServer.setEncoding('binary');
   resServer.on('data', function(data) { // store the image data in a buffer
    bufData.write(data, iCur, 'binary');
    iCur += data.length;
   });
   resServer.on('end', function() { // mogrify only works on files, write the buffer, mog it, send it back
    var sFileName = ''+(new Date().getTime());
    fs.writeFile(sFileName,bufData,function() {
     var mogrify = child.spawn('mogrify', [ '-blur', '100', sFileName ]);
     mogrify.on('exit', function() {
      fs.readFile(sFileName, function(e, mogrifiedData) {
       fs.unlink(sFileName, function(){}); // delete the image from the disk
       resClient.end(mogrifiedData); // send the mogrified image back to the client
      });
     });
    });
   });
  }
  else { // not an image, send the data straight to the client
   resServer.on('data', function(data) { resClient.write(data); });
   resServer.on('end', function() { resClient.end(); });
  }
 });
 reqServer.end(); // this line actually sends the request
}).listen(8080);

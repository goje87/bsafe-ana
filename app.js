'use strict';
var http = require('http')
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var request = require('request');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var rstats  = require('rstats');
var R  = new rstats.session();
var schemas = {
  analysisData: require('./model/analysisData').schema,
  sensorData: require('./model/sensorData').schema
};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  next();
});

app.use(bodyParser.json({ extended: true }));

app.use(methodOverride(function(req){
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

////////////////// Testing R ////////////////////////////////////////////////////////////
var fs = require('fs');
var speedBreakerCount = 0;
function runAnalysis(frame){
      var executeThis = "";
      var xComponent = "x <- c(";
      var yComponent = "y <- c(";
      var zComponent = "z <- c(";
      var timeComponent = "t <- c(";
      var timeAtEvent = frame[50].timestamp;
      for(var counter=0; counter<99; counter++){
        //console.log(datatoAnalyze[counter] + "\n");
        xComponent = xComponent + JSON.stringify(frame[counter].acc.x) + ", ";
        yComponent = yComponent + JSON.stringify(frame[counter].acc.y) + ", ";
        zComponent = zComponent + JSON.stringify(Math.abs(frame[counter].acc.z)) + ", ";
        timeComponent = timeComponent + JSON.stringify(frame[counter].timestamp) + ", ";
      }
      xComponent = xComponent.substring(0, xComponent.length - 2) + ");";
      yComponent = yComponent.substring(0, yComponent.length - 2) + ");";
      zComponent = zComponent.substring(0, zComponent.length - 2) + ");";
      timeComponent = timeComponent.substring(0, timeComponent.length - 2) + ");";
      executeThis = "" + zComponent + timeComponent + " fit  <- lm(z~poly(t,11,raw=TRUE)); newdata=data.frame(t=1441133867695); predict(fit,newdata,interval='predict')";
      var x = R.parseEval(executeThis);
      //console.log(executeThis);
      //console.log(frame[50].acc.z + ", " +  frame[50].timestamp);
      if(x[0].fit > 0.55){
        //console.log(x[0].fit);
        speedBreakerCount++;
        console.log(speedBreakerCount);
        console.log("Force on XY plane " + Math.sqrt((frame[50].acc.x * frame[50].acc.x) + (frame[50].acc.y * frame[50].acc.y)));
      }

};

function analyzeRide(rideId){
  var requestURL = "http://localhost:3000/sensorData/" + rideId;
  //request(requestURL).pipe(fs.createWriteStream("./rideFiles/" + rideId + ".json"))
  var rideFile = require("./rideFiles/" + rideId + ".json");
if(rideFile.data.length > 100){
    var frame = [0];
    var frameLength = 100;
    var frameCenter = frameLength/2;
    var zThreshold = 0.8;
    var i =0;
    for(i=0; i<100; i++){
      frame[i]=rideFile.data[i];
    }
    while(i<rideFile.data.length){
      if(Math.abs(frame[frameCenter].acc.z) > zThreshold){
        runAnalysis(frame);
      }
      i++;
      frame.push(rideFile.data[i]);
      frame.shift();
    }
  }else {
    console.log("Ride is too short!")
  }
};

analyzeRide(3);

// var rideData = require('./98033.json');
// var i = 0;
//
// // while(i < rideData.data.length-1){
// //   if(rideData.data[i].timestamp != rideData.data[i+1].timestamp) {
// //     //console.log(rideData.data[i].timestamp + ", " + rideData.data[i].acc.x);
// //     fs.appendFileSync("./xCSV", "{ 'x':" + rideData.data[i].acc.x + ", 'timestamp': " + rideData.data[i].timestamp + "}, " );
// //   }
// //   i++;
// // }
// var speedBreakerCount = 0;
// function analyze(datatoAnalyze){
//   //console.log(" IN ANALYZE ")
//   console.log(datatoAnalyze.length);
//   //console.log(datatoAnalyze);
//   if(datatoAnalyze.length == 100){
//     console.log(" IN ANALYZE ")
//     var executeThis = "";
//     var xComponent = "x <- c(";
//     var yComponent = "y <- c(";
//     var zComponent = "z <- c(";
//     var timeComponent = "t <- c(";
//     for(var counter=0; counter<99; counter++){
//       //console.log(datatoAnalyze[counter] + "\n");
//       xComponent = xComponent + JSON.stringify(datatoAnalyze[counter].acc.x) + ", ";
//       yComponent = yComponent + JSON.stringify(datatoAnalyze[counter].acc.y) + ", ";
//       zComponent = yComponent + JSON.stringify(datatoAnalyze[counter].acc.z) + ", ";
//       timeComponent = timeComponent + JSON.stringify(datatoAnalyze[counter].timestamp) + ", ";
//     }
//     xComponent = xComponent.substring(0, xComponent.length - 2) + ");";
//     yComponent = yComponent.substring(0, yComponent.length - 2) + ");";
//     zComponent = zComponent.substring(0, zComponent.length - 2) + ");";
//     timeComponent = timeComponent.substring(0, timeComponent.length - 2) + ");";
//     executeThis = "" + xComponent + timeComponent + " fit  <- lm(y~poly(x,4,raw=TRUE)); newdata=data.frame(x=40); predict(fit,newdata,interval='predict')";
//     //console.log(executeThis);
//     speedBreakerCount++;
//     console.log("Speed breaker at " + datatoAnalyze[99].timestamp);
//     console.log("Speedbreaker count " + speedBreakerCount);
//   }
// }
//
// function getRaw(rideId){
//   var stream = mongoose.model('sensorData').find({ 'rideId': rideId }).stream();
//   var dataSetSize = 99;
//   var counter = 0;
//   var dataSet = [];
//   dataSet[0]={acc : {'x': 0, 'y': 0, 'z': 0},'timestamp': 0};
//   stream.on('data', function (doc) {
//     // fs.appendFile("./xCSV", "{ 'x':" + JSON.stringify(doc.acc.x) + ", 'timestamp': " + JSON.stringify(doc.timestamp) + "}, ", function(err) {
//     //     if(err) {
//     //         return console.log(err);
//     //     }
//     //     console.log("The file was saved!");
//     // });
//     //res.write((isFirstDoc ? '' : ',')+JSON.stringify(doc));
//     //isFirstDoc = false;
//     //console.log(doc)
//     //console.log(doc.acc.x, doc.acc.y, doc.acc.z, doc.timestamp);
//     if(doc.timestamp != dataSet[counter].timestamp){
//       if(counter < dataSetSize){
//         dataSet.push(doc);
//         counter++;
//         if(doc.acc.y > 10.5){
//           console.log("########################## \n \n \n FOUND y > 0.5 \n ########################## \n \n \n ")
//           analyze(dataSet);
//         }
//       } else{
//         dataSet.shift();
//         dataSet.push(doc);
//         if(doc.acc.y > 10.5){
//           console.log("########################## \n \n \n FOUND y > 0.5 \n ########################## \n \n \n ")
//           analyze(dataSet);
//         }
//       }
//     }
//   });
//   stream.on('error', function (err) {
//       return next(err);
//   });
//   stream.on('close', function () {
    // var x = R.parseEval(executeThis);
    // console.log(x[0].fit);
//   });
//
// }
// //var executeInR = getRaw(1);
// getRaw(98033);
// // var executeInR = "x <- c(32,64,96,118,126,144,152.5,158); y <- c(99.5,104.8,108.5,100,86,64,35.3,15); fit  <- lm(y~poly(x,4,raw=TRUE)); newdata=data.frame(x=40); predict(fit,newdata,interval='predict')";
//
// // R.assign('');
// // //R.parseEvalQ('(x,y,pch=19)');
// // R.assign('');
// // //var x = R.parseEval("c(1,2,3)");
// // //var x = R.parseEval("cat(x)");
// // R.parseEvalQ('xx <- seq(30,160, length=50)')
// //console.log(x[0].fit);
// //R.parseEvalQ('(x,y,pch=19,ylim=c(0,150))');
// //R.parseEvalQ(lines('xx, predict(fit, data.frame(x=xx)), col="red")')
//

////////////////// Testing R ////////////////////////////////////////////////////////////

app.listen(3000, function(){
  console.log('Running on port 3000');
});

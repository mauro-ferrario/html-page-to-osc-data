const express = require('express');
const app = express();
const serverIp = '0.0.0.0';
const osc = require("osc");
let udpPort;
let udpReady = false;
const  request = require('request');
const fs = require('fs');
let settings = {};

/* Variables */

let serverPort = 3000;
let ipToSend = '0.0.0.0';
let receivePort = 12346;
let sendPort = 12345;
let url = 'http://mduranti.web.cern.ch/mduranti/';
let delay = 10000;


function readSettings(fileName){
    const contents = fs.readFileSync(__dirname + '/'+fileName);
    settings = JSON.parse(contents);
    serverPort      = settings.serverPort;
    ipToSend        = settings.ipToSend;
    receivePort     = settings.receivePort;
    sendPort        = settings.sendPort;
    url             = settings.url;
    delay           = settings.delayInSeconds*1000;
}


function getDataArray(){
    request(url, function (error, response, body) {
        const status = response && response.statusCode;
        if(!error && status == 200){     
            onGetDataFromUrl(body); 
        } 
        else{
            console.log(error);
            console.log(status);
        }
        setTimeout(getDataArray, delay);
    })
}

function onGetDataFromUrl(body){
    const word = 'Rigidity';
    var count = (body.match(/Rigidity/g) || []).length;
    let data = [];
    let dataToFetch = body;
    const time = Date(Date.now()).toString();
    if(count > 0){
        console.log(time +" - Send OSC to port " + sendPort);
        for(let a = 0; a < count; a++){
            const indexOfFirstWord = dataToFetch.indexOf(word);
            let newBody = dataToFetch.substring(indexOfFirstWord, 1000);
            const indexOfFirstBr = newBody.indexOf('<br>');
            newBody = newBody.substring(word.length+1, indexOfFirstBr-1);
            const singleData = parseFloat(newBody);
            data.push(singleData)
            dataToFetch = dataToFetch.substring(indexOfFirstWord+word.length);
            if((a+1)%100 ==0){
                sendDataToOsc(data);
                data = [];
            }
        }
    }
    else{
        console.log(time +" - No data from the url");
    }
}

function sendDataToOsc(data){
    const oscData = [...data].map((d) => {
        return {
            type: 'f',
            value: d
        }
    });
    if(udpReady){
        udpPort.send({
            address: "/data",
            args: oscData
        }, ipToSend, sendPort);
     }
}


readSettings('settings.json');


udpPort = new osc.UDPPort({
    localAddress: serverIp,
    localPort: receivePort
});


const server = app.listen(serverPort, serverIp, function () {
    console.log("Server started on " + serverIp + ":" + serverPort);
    console.log("Fetch the website "+url+" every "+parseFloat(delay/1000,2)+" seconds")
    console.log("Send OSC message to "+ipToSend+" at port "+sendPort);
    getDataArray();
});

  
app.get('/', function (req, res) {
    
});

udpPort.on("error", function (error) {
    console.log("An error occurred: ", error.message);
});

udpPort.on("ready", function () {
    udpReady = true;
});

udpPort.open();
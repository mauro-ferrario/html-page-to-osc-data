const express = require('express');
const app = express();
const port = 3000;
const ip = '0.0.0.0';
const receivePort = 12346;
const sendPort = 12345;
const osc = require("osc");
const udpPort = new osc.UDPPort({
    localAddress: ip,
    localPort: receivePort
});
let udpReady = false;
const  request = require('request');
const url = 'http://mduranti.web.cern.ch/mduranti/';
const delay = 10000;


function getDataArray(){
    request(url, function (error, response, body) {
        const status = response && response.statusCode;
        if(!error && status == 200){     
            onGetDataFromUrl(body); 
        } 
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
    setTimeout(getDataArray, delay);
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
        }, ip, sendPort);
     }
}

const server = app.listen(port, ip, function () {
    console.log("*** Remote server *** Server started on " + ip + ":" + port);
    console.log("Fetch the website "+url+" every "+parseFloat(delay/1000,2)+" seconds")
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


const path = require('path');
const express = require('express');
const app = express();
const serverIp = '0.0.0.0';
const UdpPortHandler = require("./UDPPortHandler");
const Settings = require("./Settings");
const  request = require('request');
const osHomedir = require('os-homedir');
const settings = new Settings();
const s = settings;
let appPath = path.join(__dirname);
//appPath = path.join(osHomedir(), 'rigidity');

/* Variables */

settings.add('serverPort', 3000);
settings.add('ipToSend', '0.0.0.0');
settings.add('receivePort', 12346);
settings.add('sendPort', 12345);
settings.add('url', 'http://mduranti.web.cern.ch/mduranti/');
settings.add('delayInSeconds', '10');
settings.add('oscAddress', '/data');
settings.add('oscAddress', '/data');

const fileUrl = path.join(appPath, 'settings.json');
settings.loadFromFile(fileUrl);
let {serverPort,ipToSend,receivePort,sendPort,url,delayInSeconds,oscAddress} = settings.getAll();

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
        setTimeout(getDataArray, delayInSeconds*1000);
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
    udpHandler.sendData(oscAddress, oscData);
}

const udpHandler = new UdpPortHandler(serverIp, receivePort, ipToSend, sendPort);

const server = app.listen(serverPort, serverIp, function () {
    console.log("Server started on " + serverIp + ":" + serverPort);
    console.log("Fetch the website "+url+" every "+delayInSeconds+" seconds")
    console.log("Send OSC message to "+ipToSend+" at port "+sendPort);
    getDataArray();
});

  
app.get('/', function (req, res) {
    
});
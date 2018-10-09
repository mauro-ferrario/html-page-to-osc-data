const path = require('path');
const express = require('express');
const app = express();
const serverIp = '0.0.0.0';
const UdpPortHandler = require("./UDPPortHandler");
const Settings = require("./Settings");
const  request = require('request');
const osHomedir = require('os-homedir');
const settings = new Settings();
let appPath = path.join(__dirname);
// appPath = path.join(osHomedir(), 'rigidity');

/* Variables */

settings.add('serverPort', 3000);
settings.add('ipToSend', '0.0.0.0');
settings.add('receivePort', 12346);
settings.add('sendPort', 12345);
settings.add('url', 'http://mduranti.web.cern.ch/mduranti/');

settings.add('delayInSeconds', '10');
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
    let count = (body.match(/Rigidity/g) || []).length;
    let data = [];
    let dataToFetch = body;
    const time = Date(Date.now()).toString();
    let nextTime = "";
    let nextRate = "";
    if(count > 0){
        console.log(time +" - Send OSC to port " + sendPort);
        for(let a = 0; a < count; a++){
            const indexOfTime = dataToFetch.indexOf('Time');
            const indexOfRate = dataToFetch.indexOf('Rate'); 
            const indexOfFirstWord = dataToFetch.indexOf(word);
            let newBody = dataToFetch.substring(indexOfFirstWord, 1000);
            const indexOfFirstBr = newBody.indexOf('<br>');
            newBody = newBody.substring(word.length+1, indexOfFirstBr-1);
            const singleData = parseFloat(newBody);
            if(indexOfTime < indexOfFirstWord && indexOfTime != -1){
                // Send previous block of data and save new time and  rate
                // Send osc message for each data
                if(data.length > 0 && nextTime != ""){
                    sendBundle(nextTime, nextRate, data);
                    data = [];
                }
                nextTime = dataToFetch.substring(indexOfTime+5, indexOfTime+15);
                nextRate = dataToFetch.substring(indexOfRate+5, indexOfRate+8);

            }
            data.push(singleData)
            dataToFetch = dataToFetch.substring(indexOfFirstWord+word.length);
        }
        // Sent the last group
        sendBundle(nextTime, nextRate, data);
    }
    else{
        console.log(time +" - No data from the url");
    }
}

function sendBundle(time, rate, data){
    const timeToSend = {
        address: '/time',
        args: [
            {
                type: 's',
                value: time.toString()
            }
        ]
    };
    const rateToSend = {
        address: '/rate',
        args: [
            {
                type: 's',
                value: rate.toString()
            }
        ]
    };
    
    let rigidbodies = [];
    //udpHandler.sendData('/time', time);
    //udpHandler.sendData('/rate', rate);
    [...data].map((d) => {
        const oscData = {
            type: 'f',
            value: d
        };
        rigidbodies.push(oscData);
        //udpHandler.sendData('/rigidbody', oscData);
    });   
    const rigidbodyToSend = {
        address: '/rigidbody',
        args: rigidbodies
    };
    udpHandler.sendBundle([timeToSend, rateToSend,rigidbodyToSend]);             
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
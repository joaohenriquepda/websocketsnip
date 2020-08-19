'use strict';

const express = require('express');
const url = require('url');

const WebSocket = require('ws').Server;

const PORT = process.env.PORT || 9000;
const INDEX = '/index.html';

const server = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new WebSocket({ server: server });
console.log("SNIP WEBSOCKET EDIT FILE SERVER UP!!!");

// initialization
var CHANNELS = [];

wss.broadcastChannel = function broadcastChannel(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    var text = (channel.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";

    var msg = {
        collection: data.collection,
        thing: data.thing,
        message: text,
        status: channel.status,
        users: users,
        user: channel.user_edit
    };

    channel.forEach((client) => {
        if (client.payload.user.id === channel.id_edit) {
            msg.status = "alert";
            client.connection.send(JSON.stringify(msg));
        } else {
            msg.status = channel.status;
            client.connection.send(JSON.stringify(msg));
        }
    });
};

wss.broadcastUpdateFile = function broadcastUpdateFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });


    console.log("EDITION FILE");
    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "A edição está desabilitada",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });
};

wss.broadcastUnarchiveFile = function broadcastUnarchiveFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "Arquivo desarquivado",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });
};


wss.broadcastArchivedFile = function broadcastArchivedFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "Arquivado",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });
};

wss.broadcastSaveFile = function broadcastSaveFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    console.log("SAVE FILE");

    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "Precisa atualizar o arquivo",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });

    channel.status = "alert";
};

wss.on('connection', (ws, req) => {
    ws.on('message', function incoming(data) {
        console.log(data);
        data = JSON.parse(data);
        switch (data.message) {
            case 'open-edit':
                if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
                    console.log('Não Tinha');
                    CHANNELS[data.collection] = [];
                    CHANNELS[data.collection][data.thing] = [];
                    CHANNELS[data.collection][data.thing]["status"] = "alert";
                    CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
                    console.log(CHANNELS[data.collection][data.thing]);
                    wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
                    console.log(CHANNELS);
                } else {
                    console.log("Entidade já registrada");
                    if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
                        CHANNELS[data.collection][data.thing] = [];
                        CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
                    } else {
                        CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
                        wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
                    }
                }
                break;
            case 'unarchive-edit':
                console.log("Unarchived");
                CHANNELS[data.collection][data.thing]["status"] = "alert";
                wss.broadcastUnarchiveFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'archived-edit':
                CHANNELS[data.collection][data.thing]["status"] = "archived";
                wss.broadcastArchivedFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'reset-server':
                console.log("Reset Server");
                CHANNELS = [];
                // CHANNELS[data.collection][data.thing]["status"] = "block";
                // CHANNELS[data.collection][data.thing]["user_edit"] = data.user;
                // CHANNELS[data.collection][data.thing]["id_edit"] = data.user.id;
                // wss.broadcastUpdateFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'save-edit':
                CHANNELS[data.collection][data.thing]["status"] = "update";
                CHANNELS[data.collection][data.thing]["id_edit"] = '';
                CHANNELS[data.collection][data.thing]["user_edit"] = '';
                wss.broadcastSaveFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'file-edit':
                console.log("Editing file");
                CHANNELS[data.collection][data.thing]["status"] = "block";
                CHANNELS[data.collection][data.thing]["user_edit"] = data.user;
                CHANNELS[data.collection][data.thing]["id_edit"] = data.user.id;
                wss.broadcastUpdateFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'close-connection':
                console.log("Quit connection");
                var index = CHANNELS[data.collection][data.thing].findIndex(x => x.payload.user.id === data.user.id);
                // console.log(CHANNELS[data.collection][data.thing].length);


                if (CHANNELS[data.collection][data.thing]["id_edit"] === data.user.id) {

                    if (CHANNELS[data.collection][data.thing]["status"] != 'archived') {
                        CHANNELS[data.collection][data.thing]["status"] = 'alert';
                    }
                }
                // delete CHANNELS[data.collection][data.thing][index]
                // console.log(CHANNELS[data.collection][data.thing]);
                CHANNELS[data.collection][data.thing].splice(index, 1);
                // console.log(CHANNELS[data.collection][data.thing]);
                // if (CHANNELS[data.collection][data.thing].length === 0) {
                //     console.log("ACHOU");
                // } else {
                // }
                wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
                // CHANNELS[data.collection][data.thing][index].connection.close();
                // console.log(CHANNELS[data.collection]);
                break;
            default:
                console.log("Unexpected event");
                console.log(CHANNELS[data.collection][data.thing]);
        }
    });
});

// Context Bridge for ipcRenderer to communicate with Server
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods off of window (ie.
// window.api.sendDB in order to use ipcRenderer
// window.api.receiveDB for ipcRenderer.send
// without exposing the entire object

// FIXME: Check why it's not connecting between ipcRenderer and ipcMain
/*
contextBridge.exposeInMainWorld(
  "api",
  {
    sendDB: function(channel, ...arg) {
      ipcRenderer.send(channel, ...arg);
    },
    receiveDB: function(func){
      ipcRenderer.on("D", (event, ...args) => func(event, ...args));
    }
  });

 */

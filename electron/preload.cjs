// preload.js — 暴露最小信息给 BrowserWindow 渲染进程
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('t8pc', {
  getInfo: () => ipcRenderer.invoke('t8pc:get-info'),
});

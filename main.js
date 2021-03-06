const {app, BrowserWindow, Menu, globalShortcut, dialog, ipcMain} = require('electron')
const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 1000, height: 1200, resizable: false})

  // and load the index.html of the app.
  win.loadFile('src/index.html')


  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  const menu = Menu.buildFromTemplate([
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Sort Atoms',
          click(){
            win.loadFile('src/sorter.html');
          }
        },
        {
          label: 'Disable All Interactive On Play',
          click(){
            win.loadFile('src/setinteractive.html');
          }
        },
        {
          label: 'Mix Appearance',
          click(){
            win.loadFile('src/mixer.html');
          }
        },
        {
          label: 'In-Game Mix Appearance',
          click(){
            win.loadFile('src/mixer-ingame.html');
          }
        },
        {
          label: 'Test In-Game Mix Slider',
          click(){
            win.loadFile('src/mixer-ingame-slider.html');
          }
        },
        {
          label: 'Randomize Style',
          click(){
            win.loadFile('src/stylerandomizer.html');
          }
        },
        {
          label: 'Swap Head / Body',
          click(){
            win.loadFile('src/bodyswapper.html');
          }
        },
        {
          label: 'Emotion Engine',
          click(){
            win.loadFile('src/emotionengine.html');
          }
        }
        // {
        //   label: 'Open Scene',
        //   click(){
        //     dialog.showOpenDialog({
        //       properties: ['openFile'],
        //       title: 'Open Scene',
        //       filters: [
        //         { name: 'VAM Scene JSON', extensions: ['json'] }
        //       ]
        //     }, function( files ){
        //       if(files && files.length > 0 ){
        //         localFilePath = files[0];
        //         win.webContents.send('scene', fs.readFileSync( files[0], 'utf-8' ) );
        //       }
        //     });
        //   }
        // },
        // {
        //   label: 'Save',
        //   click(){
        //     if( localSceneData === undefined ){
        //       dialog.showMessageBox({
        //         type: 'error',
        //         message: 'No file to save. Choose Open Scene first.'
        //       });
        //       return;
        //     }
        //     fs.writeFile(localFilePath, localSceneData, function(){} );
        //   }
        // },
        // {
        //   label: 'Save As',
        //   click(){
        //     if( localSceneData === undefined ){
        //       dialog.showMessageBox({
        //         type: 'error',
        //         message: 'No file to save. Choose Open Scene first.'
        //       });
        //       return;
        //     }
        //     dialog.showSaveDialog({
        //       properties: ['openFile'],
        //       title: 'Save Scene',
        //       buttonLabel: 'Save As',
        //       filters: [
        //         { name: 'VAM Scene JSON', extensions: ['json'] }
        //       ]
        //     }, function( filename ){
        //       console.log('writing to', filename);
        //       fs.writeFile(filename, localSceneData, function(){} );
        //     });
        //   }
        // },
      ]
    },
    {
      label: 'About',
      submenu: [
        {
          label: 'By VAMDeluxe'
        }
      ]
    }
  ])

  let localFilePath;
  let localSceneData;

  ipcMain.on('sceneUpdated', function( event, message ){
    localSceneData = message;
    console.log('got new data');
  });

  Menu.setApplicationMenu(menu);

  globalShortcut.register('f5', function(){
    win.reload();
  });

  globalShortcut.register('CommandOrControl+R', function(){
    win.reload();
  });

  globalShortcut.register('CommandOrControl+Shift+I', function(){
    win.webContents.openDevTools()
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

const express = require('express');
const server = express();


const Mixer = require('./mixer');
const SceneUtil = require('./src/sceneutil');
const Store = require('electron-store');
const store = new Store();

server.use(express.static('src'));
server.get('/', function( request, response ){
  response.sendFile( 'index.html' );
});

server.listen(3000, () => console.log('In-Game WebServer 3000!'));

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let mixValue = 0.5;

wss.on('connection', function connection(ws) {

  ws.on('message', function incoming(message) {
    try {
      const json = JSON.parse(message);
      mixValue = parseFloat(json.mix);

      let mixerPath = store.get('mixerPath');
      if(mixerPath === undefined){
        console.warn('mixer path not set');
        return;
      }

      scene = SceneUtil.loadSceneFile( mixerPath );
      if( scene === undefined ){
        console.warn('could not load scene');
        return;
      }

      console.log(mixValue);
      const resultScene = Mixer( scene, mixValue );
      fs.writeFile(mixerPath, JSON.stringify( resultScene,null,2), function(){} );
    }
    catch(e){
      console.error(e);
    };
  });

  ws.send(JSON.stringify({
    action: 'mixer',
    mix: mixValue
  }));
});
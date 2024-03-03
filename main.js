const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
// Connect to Postgres
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'blog',
  password: 'password',
  port: 5432,
});
// Check if it's development mode
const isDev = process.env.NODE_ENV !== 'production';
// Check if it's on Mac
const isMac = process.platform === 'darwin';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// NOTE: This is only a security risk when the app open a third-party website or windows
// TODO: Refactor the code for secured settings
//       preload: path.join(app.getAppPath(), 'preload.js'),
//       nodeIntegration: false, // is default value after Electron v5
//       contextIsolation: true, // protect against prototype pollution
//       enableRemoteModule: false, // turn off remote
const createWindow = () => {
  mainWindow = new BrowserWindow({
    // Expand window size in DevMode
    width: isDev ? 1000 : 800,
    height: 650,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      //enableRemoteModule: true,
    }
  });

  // Open DevTool when it's development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

// Open the app window when it's ready
app.whenReady().then(() => {
  //ipcMain.handle('ping', () => 'pong');
  createWindow();

  // Open a window if none are open (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// TODO: Considering Refactoring these query code
// SELECT ALL Posts from post table
ipcMain.on('getPosts', async (event) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM post;');
    const posts = result.rows;
    event.reply('posts', posts);
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('posts', []);
  }
});

// Get all groups from group table
ipcMain.on('getGroups', async (event) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM "group";');
    const groups = result.rows;
    event.reply('groups', groups);
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('groups', []);
  }
});

// Get all user from user table
ipcMain.on('getUsers', async (event) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM "user";');
    const users = result.rows;
    event.reply('users', users);
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('users', []);
  }
});

// Get all comments for a post
ipcMain.on('getComments', async (event, postId) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM comment WHERE postid = $1 ORDER BY commentid', [postId]);
    const comments = result.rows;
    event.reply('comments', comments);
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('comments', []);
  }
});

// SELECT all Groups that a User is not a Member in
ipcMain.on('getGroupsByUser', async (event, userId) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
        SELECT $1 AS userID, g.groupID, g.name
        FROM "group" g
        LEFT JOIN membership m ON g.groupID = m.groupID AND m.userID = $1
        WHERE m.userID IS NULL;;
        `, [userId]);
    const groups = result.rows;
    event.reply('groupByUser', groups); // Sending the data back to the renderer process
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('groupByUser', []); // Sending an empty array in case of error
  }
});

// INSERT a user to a new group in Membership table
ipcMain.on('joinGroup', async (event, groupId, userId) => {
  try {
    const client = await pool.connect();
    await client.query('INSERT INTO membership (userID, groupID) VALUES ($1, $2)', [userId, groupId]);
    event.reply('joinGroupResult', true); // Sending success response
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('joinGroupResult', false); // Sending error response
  }
});

// DELETE a comment from a group
ipcMain.on('deleteComment', async (event, commentID) => {
  try {
    const client = await pool.connect();
    await client.query('DELETE FROM comment WHERE commentID = $1', [commentID]);
    event.reply('deleteCommentResult', true); // Sending success response
    // TODO: Delete for packaging
    console.log('comment deleted');
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('deleteCommentResult', false); // Sending error response
  }
});

// Ask Confirmation before Deleting or Altering the database
ipcMain.on('openDialog', async (event, options) => {
  dialog.showMessageBox(mainWindow, options)
    // Dialog returns a promise so let's handle it correctly
    .then((result) => {
      // Bail if the user pressed "Cancel" or escaped (ESC) from the dialog box
      if (result.response !== 0) {
        // TODO: Delete before packaging
        console.log('The "Cancel" button was pressed');
        return; }

      // Testing. TODO: Delete before Packaging
      if (result.response === 0) {
        console.log('The "Yes" or "Confirm" button was pressed (main process)');
      }
      // Reply to the render process
      event.reply('dialogResponse', true); // Sending confirm message
    });
})
// Database change watching
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error fetching client from pool', err);
    return;
  }
  client.on('notification', (msg) => {
    mainWindow.webContents.send('databaseChange', msg.payload);
  });
  client.query('LISTEN changes');
});

// TODO: Add confirm message box before closing
// Quit the app when all windows are closed (Windows & Linux)
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

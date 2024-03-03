const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
// Connect to Postgres
const { Pool } = require('pg');
// DOM Purify
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'blog',
  password: 'password',
  port: 5432
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
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
      // enableRemoteModule: true,
    }
  });

  // Open DevTool when it's development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
};

// Open the app window when it's ready
app.whenReady().then(() => {
  // TODO: Connect to PostgreSQL database using Client
  createWindow();

  // Open a window if none are open (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// FIXME: Refactor for Transactional Management.
//    Change Pool to Client, and set custom query. Do not use them in parallel
// Function to execute SQL query inside a transaction
// // async function executeQueryInTransaction(query, ...params) {
// //     try {
// //         await pgClient.query('BEGIN'); // Start transaction
// //         const result = await pgClient.query(query); // Execute query
// //         await pgClient.query('COMMIT'); // Commit transaction
// //         return result.rows; // Return query result
// //     } catch (error) {
// //         await pgClient.query('ROLLBACK'); // Rollback transaction on error
// //         throw error;
// //     }
// // }

// TODO: Refactor to match transaction
//     // Handle IPC message from renderer process to execute SQL query
//     ipcMain.on('executeQuery', async (event, query) => {
//         try {
//             const result = await executeQueryInTransaction(query);
//             event.reply('queryResult', result);
//         } catch (error) {
//             console.error('Error executing query:', error);
//             event.reply('queryError', error.message);
//         }
//     });

// JOIN and aggregate functions to show most popular groups by posts
ipcMain.on('getGroupReport', async (event) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT \n' +
      '    g.groupID,\n' +
      '    g.name AS groupName,\n' +
      '    COUNT(DISTINCT m.userID) AS totalMembers,\n' +
      '    COUNT(DISTINCT p.postID) AS totalPosts,\n' +
      '    MAX(p.date) AS newestPostDate,\n' +
      '    COUNT(c.commentID) AS totalComments\n' +
      'FROM \n' +
      '    "group" g\n' +
      'LEFT JOIN \n' +
      '    membership m ON g.groupID = m.groupID\n' +
      'LEFT JOIN \n' +
      '    post p ON g.groupID = p.groupID\n' +
      'LEFT JOIN \n' +
      '    comment c ON p.postID = c.postID\n' +
      'GROUP BY \n' +
      '    g.groupID, g.name\n' +
      'ORDER BY \n' +
      '    totalPosts DESC;\n'
    );
    const dashBoard = result.rows;
    event.reply('groupReportResult', dashBoard);
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('groupReportResult', []);
  }
});

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
    const result = await client.query('SELECT * FROM comment WHERE postid = $1 ORDER BY commentid;', [postId]);
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
    await client.query('INSERT INTO membership (userID, groupID) VALUES ($1, $2);', [userId, groupId]);
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
    await client.query('DELETE FROM comment WHERE commentID = $1;', [commentID]);
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
ipcMain.on('openDialog', async (event, messageOptions) => {
  dialog.showMessageBox(mainWindow, messageOptions)
    // Dialog returns a promise so let's handle it correctly
    .then((result) => {
      // Bail if the user pressed "Cancel" or escaped (ESC) from the dialog box
      if (result.response !== 0) {
        // TODO: Delete before packaging
        console.log('The "Cancel" button was pressed');
        return;
      }

      // Testing. TODO: Delete before Packaging
      if (result.response === 0) {
        console.log('The "Yes" or "Confirm" button was pressed (main process)');
      }
      // Reply to the render process
      event.reply('dialogResponse', true); // Sending confirm message
    });
});

// SELECT all Group name except for one groupid
ipcMain.on('getGroupName', async (event, groupID) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT name FROM "group" WHERE groupID <> $1;', [groupID]);
    const groupNames = result.rows;
    event.reply('groupNames', groupNames); // Sending the data back to the renderer process
    client.release();
    console.log(groupNames);
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('groupNames', []); // Sending an empty array in case of error
  }
});

function sanitizeInput (dirtyInput) {
  // Trim whitespace from the input
  const step1 = dirtyInput.trim();
  // let sanitizedInput = dirtyInput;
  // Limit the length of the input to prevent overflow
  const step2 = step1.substring(0, 1024); // Limit to 1024 characters for description

  // sanitize HTML input and prevent XSS attacks
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
  const step3 = DOMPurify.sanitize(step2);

  // Escape special characters to prevent SQL injection
  const sanitizedInput = step3.replace(/'/g, "''"); // Escape single quotes

  return sanitizedInput;
}
// UPDATE group function
// Final Handler to UPDATE Group
ipcMain.on('updateGroup', async (event, updateGroup) => {
  try {
    // Sanitize input to prevent SQL injection and XSS injection
    const cleanName = sanitizeInput(updateGroup.name);
    const cleanDescription = sanitizeInput(updateGroup.description);
    console.log(cleanName);
    console.log(cleanDescription);
    // Perform database update with sanitized input
    const client = await pool.connect();
    await client.query('UPDATE "group" SET name = $1, description = $2 WHERE groupID = $3;', [cleanName, cleanDescription, updateGroup.groupid]);
    event.reply('groupUpdated', true); // Sending success response
    console.log('Update finished');
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    event.reply('groupUpdated', false);
  }
});
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

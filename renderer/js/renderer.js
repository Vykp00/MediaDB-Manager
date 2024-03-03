// Communicate with event
const { ipcRenderer } = require('electron');
const { dialog } = require('electron');

// TODO: Queries:
// JOIN: A view on Dashboard to show total number of user, and post in a group
// SELECT all comments in a post (DONE) ✌️
// INSERT new user to a group (INSERT to membership table) (DONE) ✌️
// DELETE a comment in a post (DONE) ✌️
// UPDATE a user’s name
// TODO: Dashboard (SELECT * queries)
// Display Group Table (DONE) ✌️
// Display User Table (DONE) ✌️
// Display Post	 Table (DONE) ✌️

// GET post
document.addEventListener('DOMContentLoaded', () => {
  // Get the buttons
  const groupBtn = document.getElementById('group-btn');
  const userBtn = document.getElementById('user-btn');
  const postBtn = document.getElementById('post-btn');

  // Get ALL group
  groupBtn.addEventListener('click', () => {
    ipcRenderer.send('getGroups');
  });

  // Get ALL users
  userBtn.addEventListener('click', () => {
    ipcRenderer.send('getUsers');
  });

  // Get ALL posts
  postBtn.addEventListener('click', () => {
    ipcRenderer.send('getPosts');
  });

  // Global variable for data manipulation
  const tableBody = document.getElementById('data-output');
  const tableHeader = document.getElementById('data-header');
  const tableName = document.getElementById('table-name');

  // This render Data from icpRenderer
  function renderData (data, type) {
    console.log(data);

    const groupHeaders = ['GroupID', 'Name', 'Description', 'Option'];
    const userHeaders = ['UserID', 'Name', 'Email', 'Password', 'Option'];
    const postHeaders = ['PostID', 'UserID', 'GroupID', 'Title', 'Text', 'Date', 'Option'];
    const commentHeaders = ['CommentID', 'Text', 'Date', 'UserID', 'PostID', 'Option'];
    const canJoinGroupHeaders = ['Applicant', 'GroupID', 'Group Name', 'Select a group'];

    tableBody.innerHTML = ''; // Clear previous data
    tableHeader.innerHTML = ''; // Clear previous data
    tableName.innerHTML = ''; // Clear previous data

    // This render table title
    let headers;
    // This render Option Button text
    let btnOptionText;

    // If fetched data is Group table
    if (type === 1) {
    // create Group Header
      headers = groupHeaders;
      tableName.innerHTML = 'Group Table';
    } // If fetch data is User table
    if (type === 2) {
      headers = userHeaders;
      tableName.innerHTML = 'User Table';
      btnOptionText = 'New Membership';
    } // If fetch data is the Post table
    if (type === 3) {
      headers = postHeaders;
      tableName.innerHTML = 'Post Table';
      btnOptionText = 'View Comments';
    } // If fetch data is the Comment table
    if (type === 4) {
      headers = commentHeaders;
      tableName.innerHTML = 'Comment Table';
      btnOptionText = 'Delete';
    } // fetch data is from groupByUser table
    if (type === 5) {
      headers = canJoinGroupHeaders;
      tableName.innerHTML = 'New Membership Application';
      btnOptionText = 'Join';
    }

    // Populate header dynamically
    headers.forEach(headerText => {
      const header = document.createElement('th');
      header.textContent = headerText;
      tableHeader.appendChild(header);
    });

    // Populate data dynamically
    data.forEach(item => {
      const row = document.createElement('tr');

      Object.keys(item).forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = item[key];
        row.appendChild(cell);
      });

      // Create a cell for optionBtn
      const buttonCell = document.createElement('td');
      // This render table option button // EDIT IT TO MATCH EACH TABLE
      const getOptionBtn = setOptionBtn(btnOptionText, item);
      // Append Option button to cell
      buttonCell.appendChild(getOptionBtn);
      row.appendChild(buttonCell);

      tableBody.appendChild(row);
    });
  }
  // Get Comments of a post
  function getComments (postID) {
    ipcRenderer.send('getComments', postID);
  }

  function canJoinGroup (userID) {
    ipcRenderer.send('getGroupsByUser', userID);
    // console.log(`Fetching group for ${userID}`);
  }

  // Trigger INSERT to Membership and wait for response message
  // It triggers notification
  async function newMember(groupId, userId) {
    console.log(groupId);
    console.log(userId);
    const result = await joinGroup(groupId, userId);
    if (result.success) {
      showNotification('success', 'Joined group successfully');
      // Reload the User Table
      canJoinGroup (userId);
    } else {
      showNotification('error', 'Failed to join group');
    }
  }

  // This function INSERT new row to Membership and return a promise
  async function joinGroup(groupId, userId) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('joinGroup', groupId, userId);
      ipcRenderer.once('joinGroupResult', (event, success) => {
        resolve({ success });
      });
    });
  }

  // Ask for confirmation before dangerous execution (e.g DELETE, UPDATE)
  async function showConfirmationDialog(options) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('openDialog', options);
      ipcRenderer.once('dialogResponse', (event, success) => {
        // User click "Yes" or "Confirm", it should return true
        // If User click "Cancel" or ESC, it bails and return nothing
        resolve(success);
      });
    });
  }

  // This will DELETE a comment. Return a Promise with variable true if the execution is successful
  async function deleteComment(commentId) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('deleteComment', commentId);
      ipcRenderer.once('deleteCommentResult', (event, success) => {
        resolve(success);
      });
    });
  }

  // To delete the comment, it first asks for user confirmation from user
  // If response from openDialog is 0 === user click 'Confirm'. It started deleting the comment
  async function deleteCommentProcess(commentID, postID) {
    // Ask for confirmation
    const confirmedDelete = await showConfirmationDialog(deleteOption);
    // If true exist initiate delete Comments
    if (confirmedDelete) {
      const success = await deleteComment(commentID);
      if (success) {
        // Return confirm message
        showNotification('success', 'Comment deleted successfully');
        // Refresh table after deletion
        getComments(postID);
      } else {
        showNotification('error', 'Failed to delete comment');
      }
    }
  }


  // Render SELECT ALL group results
  ipcRenderer.on('groups', (event, groups) => {
    renderData(groups, 1);
  });

  // Render user results and addMember option
  ipcRenderer.on('users', (event, users) => {
    renderData(users, 2);
  });

  // Here we fetch group that for add member so only group that this user is not in will be display

  // Render posts results
  ipcRenderer.on('posts', (event, posts) => {
    renderData(posts, 3);
  });

  // Render comment results
  ipcRenderer.on('comments', (event, comments) => {
    renderData(comments, 4);
  });

  ipcRenderer.on('groupByUser', (event, groupsByUser) => {
    console.log('Received groupsByUser data:', groupsByUser);
    renderData(groupsByUser, 5);
  });

  // Decide the optionBtn function
  function setOptionBtn (optionText, data) {
  // This render table option button // EDIT IT TO MATCH EACH TABLE
    const optionBtn = document.createElement('button');
    if (optionText === 'View Comments') {
      optionBtn.textContent = optionText;
      // Add an onclick event listener to the button
      optionBtn.onclick = function () {
        getComments(data.postid); // Call the getComments function passing the postId
      };
    } else if (optionText === 'New Membership') {
      optionBtn.textContent = optionText;
      // Add an onclick event listener to the button
      optionBtn.onclick = function () {
        canJoinGroup(data.userid); // Call the function  to find joinable group by userid
      };
    } else if (optionText === 'Join') {
      optionBtn.textContent = optionText;
      optionBtn.onclick = async function () {
        await newMember(data.groupid, data.userid);
      }; // Call the getComments function passing the postId
    } else if (optionText === 'Delete') {
      optionBtn.textContent = optionText;
      optionBtn.onclick = async function () {
        // TODO: Delete later
        console.log(data.commentid);
        console.log(data.postid);
        await deleteCommentProcess(data.commentid, data.postid);
      }; // Call the getComments function passing the postId
    } else {
      optionBtn.textContent = 'Others';
      // Add an onclick event listener to the button
      optionBtn.onclick = function () {
        console.log('Other functions'); // Call the other function passing the postId
      };
    }

    return optionBtn;
  }
});

// Delete option for comment
let deleteOption = {
  type: 'question',
  buttons: ['Confirm', 'Cancel'],
  defaultId: 1, // Index of the Cancel button in the buttons array which will be selected by default when the message box opens.
  title: 'Confirm Deletion',
  message: 'Are you sure you want to delete this comment? 🗑️'
}

// General Notification
function showNotification(type, message) {
  const notification = new Notification('Notification', {
    body: message
  });
}

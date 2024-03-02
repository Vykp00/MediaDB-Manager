// Communicate with event
const { ipcRenderer } = require('electron');
// Queries for the application:
// JOIN: A view on Dashboard to show total number of user, and post in a group
// SELECT all comments in a post (DONE) ✌️
// INSERT new user to a group (INSERT to membership table)
// DELETE a comment in a post
// UPDATE a user’s name
// For Dashboard (SELECT * queries)
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

  // Decide the optionBtn fucntion
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

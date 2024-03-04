// Communicate with event
const { ipcRenderer } = require('electron');

// GET post
document.addEventListener('DOMContentLoaded', () => {
  // Display Group Report when documented loaded
  ipcRenderer.send('getGroupReport');
  // Render JOIN popular group report
  ipcRenderer.on('groupReportResult', (event, dashBoard) => {
    renderData(dashBoard, 6);
  });
  // Get the buttons
  const dashBoardBtn = document.getElementById('dashboard-btn');
  const groupBtn = document.getElementById('group-btn');
  const userBtn = document.getElementById('user-btn');
  const postBtn = document.getElementById('post-btn');

  // Back to DashBoard
  dashBoardBtn.addEventListener('click', () => {
    ipcRenderer.send('getGroupReport');
  });

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

    const dashBoardHeaders = ['GroupID', 'Group Name', 'Total Members', 'Total Posts', 'Latest Post Date', 'Total Comments'];
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
      btnOptionText = 'Edit Profile';
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
    } // If fetch data is from groupByUser table
    if (type === 5) {
      headers = canJoinGroupHeaders;
      tableName.innerHTML = `New Membership Application for ${data[0].userid}`;
      btnOptionText = 'Join';
    } // if fetch data is from getGroupReport table
    if (type === 6) {
      headers = dashBoardHeaders;
      tableName.innerHTML = 'Popular Groups';
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
      // Except for Dashboard
      if (type !== 6) {
        const buttonCell = document.createElement('td');
        // This render table option button // EDIT IT TO MATCH EACH TABLE
        const getOptionBtn = setOptionBtn(btnOptionText, item);
        // Append Option button to cell
        buttonCell.appendChild(getOptionBtn);
        row.appendChild(buttonCell);
      }

      tableBody.appendChild(row);
    });
  }

  // Get Comments of a post
  function getComments (postID) {
    ipcRenderer.send('getComments', postID);
  }

  function canJoinGroup (userID) {
    ipcRenderer.send('getGroupsByUser', userID);
  }

  function getGroupName (groupID) {
    ipcRenderer.send('getGroupName', groupID);
  }

  // Trigger INSERT to Membership and wait for response message
  // It triggers notification
  async function newMember (groupId, userId) {
    const result = await joinGroup(groupId, userId);
    if (result.success) {
      showNotification('success', 'Joined group successfully');
      // Reload the User Table
      canJoinGroup(userId);
    } else {
      showNotification('error', 'Failed to join group');
    }
  }

  // This function INSERT new row to Membership and return a promise
  async function joinGroup (groupId, userId) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('joinGroup', groupId, userId);
      ipcRenderer.once('joinGroupResult', (event, success) => {
        resolve({ success });
      });
    });
  }

  // Ask for confirmation before dangerous execution (e.g. DELETE, UPDATE)
  async function showConfirmationDialog (options) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('openDialog', options);
      ipcRenderer.once('dialogResponse', (event, success) => {
        // User click "Yes" or "Confirm", it should return true
        // If User click "Cancel" or ESC, it bails and return nothing
        resolve({ success });
      });
    });
  }

  // This will DELETE a comment. Return a Promise with variable true if the execution is successful
  async function deleteComment (commentId) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('deleteComment', commentId);
      ipcRenderer.once('deleteCommentResult', (event, success) => {
        resolve({ success });
      });
    });
  }

  // This will UPDATE a group profile.  Return a Promise with variable true if the execution is successful
  async function updateGroup (groupForm) {
    return new Promise((resolve, reject) => {
      ipcRenderer.send('updateGroup', groupForm);
      ipcRenderer.once('groupUpdated', (event, success) => {
        resolve({ success });
      });
    });
  }

  // To update the group info, it first asks for user confirmation from user
  // If response from openDialog is 0 === user click 'Yes'. It started the update process
  async function updateGroupProcess (groupForm) {
    // Ask for confirmation
    const confirmedUpdate = await showConfirmationDialog(updateOption);
    // If true exist initiate the update execution
    if (confirmedUpdate) {
      const success = await updateGroup(groupForm);
      if (success) {
        showNotification('success', 'Group updated successfully');
        // Refresh table after updating
        ipcRenderer.send('getGroups');
        // Clear old form
        const oldForm = document.getElementById('form-container');
        oldForm.innerHTML = '';
      } else {
        showNotification('error', 'Failed to update group');
      }
    }
  }

  // To delete the comment, it first asks for user confirmation from user
  // If response from openDialog is 0 === user click 'Confirm'. It started deleting the comment
  async function deleteCommentProcess (commentID, postID) {
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

  // Render posts results
  ipcRenderer.on('posts', (event, posts) => {
    renderData(posts, 3);
  });

  // Render comment results
  ipcRenderer.on('comments', (event, comments) => {
    renderData(comments, 4);
  });

  // Here we fetch group that for add member so only group that this user is not in will be display
  ipcRenderer.on('groupByUser', (event, groupsByUser) => {
    renderData(groupsByUser, 5);
  });

  let groupList; // Contain existing group name

  // Fetch group name list except for 1 groupId
  ipcRenderer.on('groupNames', (event, groupNames) => {
    groupList = groupNames;
  });

  // Decide the optionBtn function
  function setOptionBtn (optionText, data) {
  // This render table option button // EDIT IT TO MATCH EACH TABLE
    const optionBtn = document.createElement('button');
    optionBtn.className = 'btn success';
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
        canJoinGroup(data.userid); // Call the function  to find join able group by userid
      };
    } else if (optionText === 'Join') {
      optionBtn.textContent = optionText;
      optionBtn.onclick = async function () {
        await newMember(data.groupid, data.userid);
      }; // Call the getComments function passing the postId
    } else if (optionText === 'Delete') {
      optionBtn.className = 'btn cancel-btn';
      optionBtn.textContent = optionText;
      optionBtn.onclick = async function () {
        await deleteCommentProcess(data.commentid, data.postid);
      }; // Call the editProile function passing the groupID
    } else if (optionText === 'Edit Profile') {
      optionBtn.textContent = optionText;
      optionBtn.onclick = async function () {
        await getGroupName(data.groupid);
        await renderEditForm(data);
      };
    } else {
      optionBtn.textContent = 'Others';
      // Add an onclick event listener to the button
      optionBtn.onclick = function () {
        console.log('Other functions');
      };
    }

    return optionBtn;
  }

  // validate Form input
  async function validateInput (updateGroup) {
    // Check if name is unique
    const messageElement = document.getElementById('group-name-message');
    messageElement.textContent = ''; // Clear message if it's unique

    // Trim whitespace from the input
    // convert to lowercase for case-sensitive search
    const lowercaseNewGroupName = updateGroup.name.trim().toLowerCase();

    // Iterate over the array of existing group names
    const result = !groupList.some(group => group.name.trim().toLowerCase() === lowercaseNewGroupName);

    // Validation logic to ensure name uniqueness and character limits
    if (result === false) {
      messageElement.textContent = 'This name is taken';
      messageElement.style.color = 'red';
      // alert('Group name must be unique');
      return false;
    } else if (updateGroup.name.length > 128) {
      alert('Group name exceeds character limit (128 characters)');
      return false;
    } else if (updateGroup.description.length > 1024) {
      alert('Description exceeds character limit (1024 characters)');
      return false;
    } else {
      return true;
    }
  }

  // Rendering Form for editing Group
  async function renderEditForm (groupData) {
    const formContainer = document.getElementById('form-container');
    formContainer.innerHTML = ''; // Clear previous form if any
    const formTitle = document.createElement('h4');
    formTitle.textContent = 'Edit Group Profile';
    formContainer.appendChild(formTitle);
    formContainer.appendChild(document.createElement('br'));
    formContainer.appendChild(document.createElement('br'));

    // create new form and wait for validation
    const groupForm = document.createElement('form');
    groupForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // Prevent reloading
      const formData = new FormData(groupForm);
      // Get new group data
      const updatedGroup = {
        groupid: groupData.groupid,
        name: formData.get('name'),
        description: formData.get('description')
      }; // Validate input
      const checkInput = await validateInput(updatedGroup);
      if (checkInput === true) {
        await updateGroupProcess(updatedGroup);
      }
    });

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name: (max 128 characters)';
    groupForm.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.id = 'group-name-input';
    nameInput.setAttribute('type', 'text');
    nameInput.setAttribute('name', 'name');
    nameInput.required = true;// Prevent submit when it's empty
    nameInput.minLength = 1;
    nameInput.maxLength = 128; // Set max name character to 128;
    nameInput.setAttribute('value', groupData.name);
    const nameWarning = document.createElement('span');
    nameWarning.id = 'group-name-message';
    groupForm.appendChild(nameInput);
    groupForm.appendChild(nameWarning);
    groupForm.appendChild(document.createElement('br'));

    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description: (max 1024 characters)';
    groupForm.appendChild(descriptionLabel);

    const descriptionInput = document.createElement('textarea');
    descriptionInput.setAttribute('name', 'description');
    descriptionInput.textContent = groupData.description;
    descriptionInput.required = true;// Prevent submit when it's empty
    descriptionInput.minLength = 0;
    descriptionInput.maxLength = 1024; // Set max name character to 1024

    groupForm.appendChild(descriptionInput);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    groupForm.appendChild(buttonContainer);

    const submitButton = document.createElement('button');
    submitButton.className = 'btn summit-btn';
    submitButton.setAttribute('type', 'submit');
    submitButton.textContent = 'Submit';
    buttonContainer.appendChild(submitButton);

    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn cancel-btn';
    cancelButton.setAttribute('type', 'button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = function () {
      formContainer.innerHTML = ''; // Clear Form when click
    };
    buttonContainer.appendChild(cancelButton);

    formContainer.appendChild(groupForm);
  }
});

// Delete option for comment
const deleteOption = {
  type: 'question',
  buttons: ['Confirm', 'Cancel'],
  defaultId: 1, // Index of the Cancel button in the buttons array which will be selected by default when the message box opens.
  title: 'Confirm Deletion',
  message: 'Are you sure you want to delete this comment? 🗑️'
};

// Update option for group
const updateOption = {
  type: 'question',
  buttons: ['Yes', 'Cancel'],
  defaultId: 1, // Index of the Cancel button in the buttons array which will be selected by default when the message box opens.
  title: 'Confirm Group Change',
  message: 'Are you sure you want to change this group information?'
};

// General Notification
function showNotification (type, message) {
  const notification = new Notification('Notification', {
    body: message
  });
}

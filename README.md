# MediaDB Manager ![Current Version](https://img.shields.io/badge/Version-1.0.0-green)
![Node Version](https://img.shields.io/badge/node-v20.1.1-%23339933?logo=nodedotjs)
![Npm Version](https://img.shields.io/badge/npm-v10.2.4-%23CB3837?logo=npm)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%234169E1?logo=postgresql&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-blue?logo=electron&logoColor=white)

MediaDB Manager is a light-weight database management system for our Blog database on PostgreSQL that offer an effortless way to manage your database.
The queries executions and features should be user-friendly and limits users' errors and harmful actions that can affect the quality of the main database systems. 

**Main Usages:**
* View the most popular groups and posts.
* View Group Table, Comment Table, and User Table
* Removal of comments from posts
* Addition of users to groups they are not part of a.k.a New Membership.
* Update the group name and description.

## Table Of Content

- [Support Platforms](#support-platforms)
- [Installation](#installation)
- [Packaging](#packaging)
- [License](#license)

![screen](https://github.com/Vykp00/MediaDB-Manager/blob/main/assets/icons/screen.png)

## Support Platforms
The application have been tested on Windows 10 (H22H2), Ubuntu 22.04.4 LTS (Jammy Jellyfish), and MacOS (Sonoma 14.3 iirc).

## Installation
### Required packages
<details open>
<summary>
Important prerequisites
</summary> <br />
First, make sure that you have the following prerequisites installed:

- NodeJS 20.11.1 LTS (Recommend install NodeJS with [nvm](https://github.com/nvm-sh/nvm) to prevent future version conflict. We highly reccommend you use latest LTS version with [Electron release](https://www.electronjs.org/docs/latest/tutorial/electron-timelines))
- [PostgreSQL](https://www.postgresql.org/)
</details>

1. Fork or clone the repository and install dependencies
```bash
git clone https://github.com/Vykp00/MediaDB-Manager.git
cd MediaDB-Manager
npm install
```
2. Configure PostgreSQL database
   This application will search this database by defaults so you need to setup the following details on your PostgreSQL:
    * **user/owner**: postgres,
    * **host:** localhost,
    * **database:** blog,
    * **password:** Qwerty1234,
    * **port:** 5432
   Query to create your own table:
```SQL
-- Create user table 
CREATE TABLE "user" ( 
    userID varchar(128) PRIMARY KEY, 
    name varchar(50), 
    email varchar(320), 
    password varchar(128) 
);

-- Create group table 
CREATE TABLE "group" ( 
    groupID varchar(128) PRIMARY KEY, 
    name varchar(128), 
    description varchar(1024) 
);

-- Create post table 
CREATE TABLE post ( 
    postID varchar(128) PRIMARY KEY, 
    userID varchar(128), 
    groupID varchar(128), 
    title varchar(60), 
    text text, 
    date date, 
    FOREIGN KEY (userID) REFERENCES "user" (userID) ON DELETE CASCADE, 
    FOREIGN KEY (groupID) REFERENCES "group" (groupID) ON DELETE CASCADE 
); 

-- Create comment table 
CREATE TABLE comment ( 
    commentID varchar(128) PRIMARY KEY, 
    text text, 
    date date, 
    userID varchar(128), 
    postID varchar(128), 
    FOREIGN KEY (userID) REFERENCES "user" (userID) ON DELETE CASCADE, 
    FOREIGN KEY (postID) REFERENCES post (postID) ON DELETE CASCADE 

); 

-- Create membership table 
CREATE TABLE membership ( 
    userID varchar(128), 
    groupID varchar(128), 
    joinDate date,
    PRIMARY KEY (userID, groupID), 
    FOREIGN KEY (userID) REFERENCES "user" (userID) ON DELETE CASCADE, 
    FOREIGN KEY (groupID) REFERENCES "group" (groupID) ON DELETE CASCADE 
); 
```
   ![Media ERD Diagram](https://github.com/Vykp00/MediaDB-Manager/blob/main/assets/icons/mediaProject%20ERD.png)
   <br /><br />
3. Start the server

```bash
npm run start
```
## Packaging
To package the application.
```bash
npm run make
```
Some usefule materials: <br />
[Electron - Packaging your Application](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging#importing-your-project-into-forge) <br />
[Electron Forge](https://www.electronforge.io/)

## License

The Studio.ai web application is licensed under the terms of the [Apache 2.0](./LICENSE)
license and is available for free.

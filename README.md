# Total Recall Server

## Requirements 
MySQL Server v. 5.5+

Node.js v 5+

npm (Node Package Manager) v3.3.6+

## Installation
+ Standard Node.js installation using npm
  - Navigate to the server directory and issue `npm install` on the command-line
+ Set up MySQL
  - Create the database, `total_recall`
  - Load the db template (util/tr.db.template) into this database 
  - Add corpora, topics, and relevance assessments either manually or using the helper scripts in util/
    + Samples of each csv file are provided in util/samples
  - Insert group identifiers into allowed_groups table to be used for authenticating requests
  
## Running the server
The server is ran by issuing the command `node server.js`
  - By default, the server runs on 0.0.0.0:33333
  - To change these defaults, you will need to edit server/server.js

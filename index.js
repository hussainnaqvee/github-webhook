const express = require('express');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');
require("dotenv").config();

const hmac = crypto.createHmac("sha1", process.env.GITHUB_SECRET);

const app = express();
const port = process.env.PORT || 3000;

//config variables for github
let isDocumentationWebsiteUpdated = false;
let isContributorsUpdated = false;
let isMindmapUpdated = false;

let documentationWebsiteBuildTime = Date.now();
let mindmapBuildTime = Date.now();
let contributorsBuildTime = Date.now();

app.use(express.json());

app.post("/webhook", async (req, res) => {
  console.log("req receieved");
  const signature = req.headers["x-hub-signature"];
  const payload = JSON.stringify(req.body);

  const calculatedSignature = `sha1=${hmac.update(payload).digest("hex")}`;

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature))) {
    const result = await getBranchStatus(req);
    result ? res.sendStatus(result) : res.sendStatus(400);
    // res.sendStatus(200);
  } else {
    console.log("Invalid signature");
    res.sendStatus(400);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${port}`);
});

/*
https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
*/
//https://smee.io/fk2ncMRBOxWycBQ

const getBranchStatus = async (req) => {
  console.clear();
  // console.log(req.body);
  console.log("Webhook received successfully");

  var branchNames = req.body["ref"].split("/");
  var branchName = branchNames.pop();
  var headCommit = req.body["head_commit"];
  var addedFiles = headCommit["added"];
  var removedFiles = headCommit["removed"];
  var modifiedFiles = headCommit["modified"];

  console.log(`Branch Name: ${branchName}`);
  return branchName === process.env.BRANCH_NAME ? await buildProject(branchName, addedFiles, removedFiles, modifiedFiles) : null;
};

const executeCmd = async (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(stderr + "\n" + stdout);
      } else {
        resolve(stderr + "\n" + stdout);
      }
    });
  });
};

const isProjectUpdated = (projectName,addedFiles,modifiedFiles,removedFiles) => { 
    return addedFiles.some((str) => str.includes(projectName)) || modifiedFiles.some((str) => str.includes(projectName)) || removedFiles.some((str) => str.includes(projectName));
}

const buildProject = async (branchName, addedFiles, removedFiles, modifiedFiles) => { 
    if (branchName === process.env.BRANCH_NAME) {
      if (isProjectUpdated("mindmap", addedFiles, modifiedFiles, removedFiles)) {
        isMindmapUpdated = true;
      }
      if (isProjectUpdated("documentation-website", addedFiles, modifiedFiles, removedFiles)) {
        isDocumentationWebsiteUpdated = true;
      }
      if (isProjectUpdated("contributors", addedFiles, modifiedFiles, removedFiles)) {
        isContributorsUpdated = true;
      }
    }
    //pull the project
    executeCmd(`${process.env.PROJECT_PATH} && ${process.env.PULL_CMD}`);
    
    //make sure npm install all libraries
    executeCmd(`${process.env.PROJECT_PATH} && npm install`);
    //build the mindmap
    if (isMindmapUpdated || true) {
      console.log("Building Mindmap");
      executeCmd(`${process.env.PROJECT_PATH}/mindmap && npm run build`);
      mindmapBuildTime = Date.now();
      isMindmapUpdated = false;
    }
    //build the contributors
    if (isContributorsUpdated || true) {
      console.log("Building Contributors");
      executeCmd(`${process.env.PROJECT_PATH}/documentation-website && npm run contributors`);
      contributorsBuildTime = Date.now();
      isContributorsUpdated = false;
    }
    //build the documentation website
    if (isDocumentationWebsiteUpdated || true) {
      console.log("Building Documentation Website");
      executeCmd(`${process.env.PROJECT_PATH}/documentation-website && npm run build`);
      documentationWebsiteBuildTime = Date.now();
      isDocumentationWebsiteUpdated = false;
    }
    return 200;
}
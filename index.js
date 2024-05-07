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
    console.log("Result: ", result);
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

//Currently using http for testing
/*
https.createServer({
    key: fs.readFileSync(process.env.KEY_PATH),
    cert: fs.readFileSync(process.env.CERT_PATH)
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

const isProjectUpdated = (projectName, addedFiles, modifiedFiles, removedFiles) => {
  return addedFiles.some((str) => str.includes(projectName)) || modifiedFiles.some((str) => str.includes(projectName)) || removedFiles.some((str) => str.includes(projectName));
};

const buildProject = async (branchName, addedFiles, removedFiles, modifiedFiles) => {
  const currentTime = Date.now();

  if (branchName === process.env.BRANCH_NAME) {
    if (isProjectUpdated("mindmap", addedFiles, modifiedFiles, removedFiles)) {
      isMindmapUpdated = true;
    }
    if (isProjectUpdated("documentation-website", addedFiles, modifiedFiles, removedFiles)) {
      isDocumentationWebsiteUpdated = true;
    }
  }

  //stash the unwanted changes in the project
  // executeCmd(`cd ${process.env.PROJECT_PATH} && git stash`);
  //checkout to the branch
  executeCmd(`cd ${process.env.PROJECT_PATH} && git checkout ${branchName}`);
  //pull the project
  executeCmd(`cd ${process.env.PROJECT_PATH} && git pull`);

  //installing libraries through npm install
  executeCmd(`cd ${process.env.PROJECT_PATH} && npm install`);

  //build the mindmap
  if (isMindmapUpdated || mindmapBuildTime === undefined || (currentTime - mindmapBuildTime) / 1000 / 60 > process.env.MINDMAP_UPDATE_TIME_INTERVAL) {
    console.log("Building Mindmap");
    await executeCmd(`cd ${process.env.PROJECT_PATH}/mindmap && npm run build`);
    mindmapBuildTime = Date.now();
    isMindmapUpdated = false;

    //moving the build files to the server
    // exec(`cp -r ${process.env.PROJECT_PATH}/mindmap/dist/ ${process.env.DIST_PATH}`);
    await executeCmd(`cp -r ${process.env.PROJECT_PATH}/mindmap/dist/ ${process.env.DIST_PATH}`);
  }

  // build the contributors
  if (contributorsBuildTime === undefined || (currentTime - contributorsBuildTime) / 1000 / 60 > process.env.CONTRIBUTORS_UPDATE_TIME_INTERVAL) {
    console.log("Building Contributors");
    await executeCmd(`cd  ${process.env.PROJECT_PATH}/documentation-website && npm run contributors`);
    contributorsBuildTime = Date.now();

    //moving the build files to the server
    // exec(`cp -r ${process.env.PROJECT_PATH}/documentation-website/dist/ ${process.env.DIST_PATH}`);
    // await executeCmd(`cp -r ${process.env.PROJECT_PATH}/documentation-website/dist/ ${process.env.DIST_PATH}`);
  }

  //build the documentation website
  if (isDocumentationWebsiteUpdated || documentationWebsiteBuildTime === undefined || (currentTime - documentationWebsiteBuildTime) / 1000 / 60 > process.env.DOCUMENTATION_WEBSITE_UPDATE_TIME_INTERVAL) {
    console.log("Building Documentation Website");
    await executeCmd(`cd  ${process.env.PROJECT_PATH}/documentation-website && npm run build`);
    documentationWebsiteBuildTime = Date.now();
    isDocumentationWebsiteUpdated = false;

    //moving the build files to the server
    // exec(`cp -r ${process.env.PROJECT_PATH}/documentation-website/dist/ ${process.env.DIST_PATH}`);
    await executeCmd(`cp -r ${process.env.PROJECT_PATH}/documentation-website/dist/ ${process.env.DIST_PATH}`);
  }

  return 200;
};
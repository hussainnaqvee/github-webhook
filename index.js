const express = require('express');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');
require('dotenv').config();

const hmac = crypto.createHmac('sha1', process.env.GITHUB_SECRET);

const app = express();
const port = process.env.PORT || 3000

app.use(express.json());

app.post('/webhook', async(req, res) => {
    console.log('req receieved');
    const signature = req.headers['x-hub-signature'];
    const payload = JSON.stringify(req.body);

    const calculatedSignature = `sha1=${hmac.update(payload).digest('hex')}`;

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature))) {
        await getBranchStatus(req);
        res.sendStatus(200);
    } else {
        console.log('Invalid signature');
        res.sendStatus(400);
    }
});

app.listen(process.env.PORT,()=>{
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
    console.log('Webhook received successfully');

    var branchNames = req.body['ref'].split('/');
    var branchName = branchNames.pop();
    var headCommit = req.body['head_commit'];
    var addedFiles = headCommit['added'];
    var removedFiles = headCommit['removed'];
    var modifiedFiles = headCommit['modified'];

    console.log(`Branch Name: ${branchName}`);
        if (branchName === process.env.BRANCH_NAME) {
        
        if (addedFiles.length > 0) {
            console.log(`Added Files: ${addedFiles}`);
        }
        if (removedFiles.length > 0) {
            console.log(`Removed Files: ${removedFiles}`);
        }
        if (modifiedFiles.length > 0) {
            console.log(`Modified Files: ${modifiedFiles}`);
            let isModified = modifiedFiles.some((str)=>str.includes("src"));
            if(isModified){
                console.log("Modified src files");
                
                await executeCmd(process.env.EXEC_CMD);
            }
        }
}
}

const executeCmd = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject(error);
            } else {
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
                resolve(stdout);
            }
        });
    });
}
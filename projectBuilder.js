const { exec } = require('child_process');
require('dotenv').config();

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

//git pull the project
executeCmd(`${process.env.PROJECT_PATH} & ${process.env.PULL_CMD}`);

//git build mindmap
// executeCmd(`${process.env.PROJECT_PATH}\\documentation-website & npm run contributors`);

//git run contributer-build
executeCmd(`${process.env.PROJECT_PATH}/documentation-website & npm run build`);

//git build documentation website
executeCmd(`${process.env.PROJECT_PATH}/documentation-website & npm run dev`)



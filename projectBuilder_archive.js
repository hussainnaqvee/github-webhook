const { exec } = require("child_process");
require("dotenv").config();

const startDate = Date.now();
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

//git pull the project
// executeCmd(`${process.env.PROJECT_PATH} & ${process.env.PULL_CMD}`);

//make sure npm install all libraries
executeCmd(`${process.env.PROJECT_PATH} && npm install`)
  .then((output) => {
    console.log(output);
    console.log(`Time taken to build the project: ${Date.now() - startDate}ms`);
  })
  .catch((error) => {
    {
      console.error(error);
    }
  });

//git build mindmap
executeCmd(`${process.env.PROJECT_PATH}/mindmap && npm install && npm run build`)
  .then((output) => {
    console.log(output);
    console.log(`Time taken to build the project: ${Date.now() - startDate}ms`);
  })
  .catch((error) => {
    {
      console.error(error);
    }
  });

//git run contributer-build
executeCmd(`${process.env.PROJECT_PATH}/documentation-website && npm install && npm run contributors`)
  .then((output) => {
    console.log(output);
    console.log(`Time taken to build the project: ${Date.now() - startDate}ms`);
  })
  .catch((error) => {
    {
      console.error(error);
    }
  });

//git build documentation website
executeCmd(`${process.env.PROJECT_PATH}/documentation-website && npm run build`)
  .then((output) => {
    console.log(output);
    console.log(`Time taken to build the project: ${Date.now() - startDate}ms`);
  })
  .catch((error) => {
    {
      console.error(error);
    }
  });

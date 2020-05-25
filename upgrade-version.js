const fs = require("fs");
const { execSync } = require("child_process");

const packageJson = require("./package.json");

const [type, debug = false] = process.argv.splice(2);
const prefix = debug ? "t" : "v";

const getNewVersion = () => {
  const { version, buildNumber } = packageJson;
  let splittedVersion = version.split(".");

  switch (type) {
    case "major":
      splittedVersion[0] = Number(splittedVersion[0]) + 1;
      splittedVersion[1] = 0;
      splittedVersion[2] = 0;
      break;

    case "minor":
      splittedVersion[1] = Number(splittedVersion[1]) + 1;
      splittedVersion[2] = 0;
      break;

    case "patch":
      splittedVersion[2] = Number(splittedVersion[2]) + 1;
      break;

    default:
      throw new Error("Type should be major, minor or patch");
  }

  const newVersion = splittedVersion.join(".");
  const androidBuildNumber = buildNumber.android + 1;

  return {
    androidBuildNumber,
    version: newVersion,
  };
};

const updatePackageJson = ({ version, androidBuildNumber }) => {
  packageJson.version = version;
  packageJson.buildNumber.android = androidBuildNumber;

  fs.writeFileSync("./package.json", JSON.stringify(packageJson, null, 2));
};

const updateInfoPList = (newVersion) => {
  const INFOPLIST_DIR = "ios/posapp/Info.plist";

  execSync(
    `/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${newVersion}" "${INFOPLIST_DIR}"`
  );

  execSync(
    `/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1" "${INFOPLIST_DIR}"`
  );
};

const fetchAndCreateNewBranch = (newVersion) => {
  execSync(
    `git checkout master && git fetch && git pull origin master && git checkout -b ${prefix}${newVersion}`
  );
};

const commitVersioning = (newVersion) => {
  execSync(
    `git add . && git commit -m "Init version ${prefix}${newVersion}" && git push origin ${prefix}${newVersion}`
  );
};

// Get new version
const upgradedVersion = getNewVersion();
// Create new branch
fetchAndCreateNewBranch(upgradedVersion.version);
// Update package.json
updatePackageJson(upgradedVersion);
// Update Info.plist
// updateInfoPList(upgradedVersion.version)
// Commit versioning
commitVersioning(upgradedVersion.version);

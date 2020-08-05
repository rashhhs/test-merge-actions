const fs = require('fs');
const {execSync} = require('child_process');

const packageJson = require('./package.json');

const [type, nextVersion] = process.argv.splice(2);
const branchPrefix = '';
const tagPrefix = 'v';

const validateVersion = () => {
  const {version} = packageJson;
  if (nextVersion.match(/^(\d)(\.\d*)*/)) {
    const fromVersion = Number(version.split('.').join(''));
    let splittedVersion = nextVersion.split('.').join('');
    const toVersion = Number(
      splittedVersion[0] * 100 + splittedVersion[1] * 10 + splittedVersion[2],
    );

    if (toVersion > fromVersion) {
      return true;
    }

    throw new Error('This version number is lower or equal than actual.');
  }

  throw new Error('Bad version pattern. Check https://semver.org/');
};

const getNewVersion = () => {
  const {version, buildNumber} = packageJson;

  if (nextVersion) {
    if (validateVersion()) {
      return {
        androidBuildNumber: buildNumber.android + 1,
        version: nextVersion,
      };
    }
  }

  let splittedVersion = version.split('.');

  switch (type) {
    case 'major':
      splittedVersion[0] = Number(splittedVersion[0]) + 1;
      splittedVersion[1] = 0;
      splittedVersion[2] = 0;
      break;

    case 'minor':
      splittedVersion[1] = Number(splittedVersion[1]) + 1;
      splittedVersion[2] = 0;
      break;

    case 'patch':
      splittedVersion[2] = Number(splittedVersion[2]) + 1;
      break;

    default:
      throw new Error('Type should be major, minor or patch');
  }

  const newVersion = splittedVersion.join('.');
  const androidBuildNumber = buildNumber.android + 1;

  return {
    androidBuildNumber,
    version: newVersion,
  };
};

const updatePackageJson = ({version, androidBuildNumber}) => {
  packageJson.version = version;
  packageJson.buildNumber.android = androidBuildNumber;

  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
};

const updateInfoPList = (newVersion) => {
  const INFOPLIST_DIR = 'ios/testApp/Info.plist';

  execSync(
    `/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${newVersion}" "${INFOPLIST_DIR}"`,
  );

  execSync(
    `/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1" "${INFOPLIST_DIR}"`,
  );
};

const fetchAndCreateNewBranch = (newVersion) => {
  execSync(
    `git checkout master && git fetch && git pull origin master && git checkout -b ${branchPrefix}${newVersion}`,
  );
};

const commitVersioning = (newVersion) => {
  execSync(
    `git add . && git commit -m "Init version ${branchPrefix}${newVersion}" && git push origin ${branchPrefix}${newVersion}`,
  );
};

// Get new version
const upgradedVersion = getNewVersion();
// Create new branch
fetchAndCreateNewBranch(upgradedVersion.version);
// Update package.json
updatePackageJson(upgradedVersion);
// Update Info.plist
updateInfoPList(upgradedVersion.version);
// Commit versioning
commitVersioning(upgradedVersion.version);

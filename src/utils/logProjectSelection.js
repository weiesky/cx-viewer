export function chooseLogProject(logs, currentProject, defaultProject, preserveCurrent = false) {
  if (preserveCurrent && currentProject && Object.hasOwn(logs, currentProject)) return currentProject;
  if (defaultProject && Object.hasOwn(logs, defaultProject)) return defaultProject;
  return Object.keys(logs)[0] || '';
}

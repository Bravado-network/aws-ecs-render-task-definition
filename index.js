import fs from "fs";
import tmp from "tmp";
import path from "path";
import { readFile } from 'fs/promises';
const core = require("@actions/core")
import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";

const region = process.env.AWS_REGION;
const ssmClient = new SSMClient({ region });

const loadTaskDefinitionAsJsObject = async () => {
  const taskDefinitionFileName = core.getInput('task-definition', { required: true });

  const taskDefPath = path.isAbsolute(taskDefinitionFileName) ?
    taskDefinitionFileName : path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFileName);

  if (!fs.existsSync(taskDefPath)) {
    throw new Error(`Task definition file does not exist: ${taskDefinitionFileName}`);
  }

  const taskDefinitionContent = await readFile(taskDefPath)
  return JSON.parse(taskDefinitionContent);
}

const findContainerDefinition = (taskDefinition) => {
  const containerName = core.getInput('container-name', { required: true });
  const containerDefinition = taskDefinition.containerDefinitions.find(definition => definition.name === containerName);

  if (!containerDefinition) {
    throw new Error('Invalid task definition: Could not find container definition with matching name');
  }

  return containerDefinition;
}

const normalizeEnvVarName = (ssmParam) => ssmParam.Name.split("/").reverse()[0];

const convertToTaskDefinitionEnvironment = (ssmParam) => ({
  name: normalizeEnvVarName(ssmParam),
  value: ssmParam.Value
});

const convertToTaskDefinitionSecret = (ssmParam) => ({
  name: normalizeEnvVarName(ssmParam),
  valueFrom: ssmParam.ARN
});

const loadParamsFromAWS = async (Path, NextPage = null) => {
  const { Parameters, NextToken } = await ssmClient.send(new GetParametersByPathCommand({
    Path,
    NextToken: NextPage
  }));

  if (NextToken) {
    const moreParams = await loadParamsFromAWS(Path, NextToken);
    return [...Parameters, ...moreParams];
  }

  return Parameters;
}

/***
 * Loads SSM params for the paths specified in ssmParamPaths argument and returns them in order. It'll return and object
 * where each key represents the order of the paths in ssmParamPaths argument. For example, for a given list ['/dev-base/backend', '/dev4/backend']
 * it'll return an object where the key 0 will have the SSM params for '/dev-base/backend' and key 1 will hava the SSM params
 * for '/dev4/backend'
 * 
 * @param ssmParamPaths - a list of SSM param paths. For example: ['/dev-base/backend', '/dev4/backend']
 * @returns object representing SSM params hierarchy like the following:
 *    { 0: [{ Name: '/dev-base/backend/BASE_URL' }], 1: [{ Name: '/dev4/backend/RAILS_ENV' }] }
 */
const loadSSMParamsGroupingByPrecedence = async (ssmParamPaths) => {
  const ssmParamPathsList = ssmParamPaths.split(',').map((ssmParamPath) => ssmParamPath.trim())

  const listOfSsmParams = []
  for (const ssmParamPath of ssmParamPathsList) {
    const params = await loadParamsFromAWS(ssmParamPath)
    listOfSsmParams.push(params) 
  }

  return listOfSsmParams.reduce((curr, ssmParams, index) => {
    curr[index] = ssmParams
    return curr
  }, {});
}

/**
 * Applies hierarchy to SSM params received in ssmParamsByPrecedence arg.
 * It'll override SSM params based on the hierarchy represented by ssmParamsByPrecedence arg.
 * For example, if the ssmParamsByPrecedence argument is:
 *  { 0: [{ Name: '/dev-base/backend/RAILS_ENV' }], 1: [{ Name: '/dev4/backend/RAILS_ENV' }] }
 * Then it'll return [{ Name: '/dev4/backend/RAILS_ENV' }]
 * 
 * @param {*} ssmParamsByPrecedence - object representing SSM params hierarchy 
 */
const joinSSMParamsByApplyingHierarchy = (ssmParamsByPrecedence) => {
  const overriddenSsmParamsMap = Object.keys(ssmParamsByPrecedence)
    .reduce((overriddenParams, ssmParamPathIndex) => {
      const ssmParams = ssmParamsByPrecedence[ssmParamPathIndex]

      const ssmParamsMap = ssmParams.reduce((acc, ssmParam) => {
        const envVarName = normalizeEnvVarName(ssmParam)
        return { ...acc, [envVarName]: ssmParam }
      }, {})

      return { ...overriddenParams, ...ssmParamsMap }
    }, {})

  return Object.values(overriddenSsmParamsMap)
}

const groupSSMParamsByType = (ssmParams) => {
  return ssmParams.reduce((current, ssmParam) => {
    switch (ssmParam.Type) {
      case 'String': return { ...current, String: [...current.String, ssmParam] }
      case 'SecureString': return { ...current, SecureString: [...current.SecureString, ssmParam] }
    }
  }, { String: [], SecureString: [] })
}

const createNewTaskDefinitionFile = (newTaskDefinition) => {
  var newTaskDefinitionFile = tmp.fileSync({
    tmpdir: process.env.RUNNER_TEMP,
    prefix: 'task-definition-',
    postfix: '.json',
    keep: true,
    discardDescriptor: true
  });
  fs.writeFileSync(newTaskDefinitionFile.name, JSON.stringify(newTaskDefinition, null, 2));

  return newTaskDefinitionFile;
}

const loadEnvironmentVariablesFromSSMIfNecessary = async () => {
  const ssmParamPaths = core.getInput('ssm-param-paths', { required: false });

  if (ssmParamPaths) {
    core.info(`SSM param paths: ${ssmParamPaths}`)
    const ssmParamsByPrecedence = await loadSSMParamsGroupingByPrecedence(ssmParamPaths)
    const finalSsmParams = joinSSMParamsByApplyingHierarchy(ssmParamsByPrecedence)
    const ssmParamsByType = groupSSMParamsByType(finalSsmParams)
  
    return {
      environment: ssmParamsByType.String.map(convertToTaskDefinitionEnvironment),
      secrets: ssmParamsByType.SecureString.map(convertToTaskDefinitionSecret)
    };
  }

  return {};
}

const run = async () => {
  try {
    const imageURI = core.getInput('image', { required: true });

    const taskDefinition = await loadTaskDefinitionAsJsObject();
    const containerDefinition = findContainerDefinition(taskDefinition);
    const environmentVariablesReplacement = await loadEnvironmentVariablesFromSSMIfNecessary();

    var newTaskDefinitionFile = createNewTaskDefinitionFile({ 
      ...taskDefinition, 
      containerDefinitions: [
        { 
          ...containerDefinition,
          ...environmentVariablesReplacement,
          image: imageURI
        }
      ]
    });

    core.setOutput('task-definition', newTaskDefinitionFile.name);
  } catch (error) {
    core.setFailed(error.message);
    core.error(error.stack);
  }
}

run()
import fs from "fs";
import tmp from "tmp";
import path from "path";
import { readFile } from 'fs/promises';
const core = require("@actions/core")
import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";

const region = process.env.AWS_REGION;
const ssmClient = new SSMClient({ region });

const loadTaskDefinitionAsJsObject = async () => {
  const taskDefinitionFileName = core.getInput('task-definition', { required: true }); //'task-definition.json' 

  const taskDefPath = path.isAbsolute(taskDefinitionFileName) ?
    taskDefinitionFileName : path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFileName);

  if (!fs.existsSync(taskDefPath)) {
    throw new Error(`Task definition file does not exist: ${taskDefinitionFileName}`);
  }

  const taskDefinitionContent = await readFile(taskDefPath)
  return JSON.parse(taskDefinitionContent);
}

const findContainerDefinition = (taskDefinition) => {
  const containerName = core.getInput('container-name', { required: true }); // 'backend-alpha' 
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

const loadParams = async (Path, NextPage = null) => {
  const { Parameters, NextToken } = await ssmClient.send(new GetParametersByPathCommand({
    Path,
    NextToken: NextPage
  }));

  if (NextToken) {
    const moreParams = await loadParams(Path, NextToken);
    return [...Parameters, ...moreParams];
  }

  return Parameters;
}

const loadSSMParamsGroupedByType = async () => {
  const ssmParamPathPattern = core.getInput('ssm-param-path-pattern', { required: false }); //'/alpha/backend/'
  const ssmParams = await loadParams(ssmParamPathPattern);
  
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

const run = async () => {
  try {
    const imageURI = core.getInput('image', { required: true }); //'509201486841.dkr.ecr.us-east-2.amazonaws.com/backend:alpha-d24b7a2aea70b42ecc1df2006aeb48871a90c67a'

    const taskDefinition = await loadTaskDefinitionAsJsObject();
    const containerDefinition = findContainerDefinition(taskDefinition);
    const ssmParamsByType = await loadSSMParamsGroupedByType();

    var newTaskDefinitionFile = createNewTaskDefinitionFile({ 
      ...taskDefinition, 
      containerDefinitions: [
        { 
          ...containerDefinition,
          image: imageURI,
          environment: ssmParamsByType.String.map(convertToTaskDefinitionEnvironment),
          secrets: ssmParamsByType.SecureString.map(convertToTaskDefinitionSecret)
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
